/**
 * The gameplay screen.
 *
 * The board is the screen: it takes the largest square that fits between the
 * header and the action row (DESIGN.md). Chrome is ordinary React Native —
 * only the board is Skia — which keeps text selectable, accessible and cheap.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GameBoard } from '../game/rendering/GameBoard';
import { LevelCompleteModal } from '../components/LevelCompleteModal';
import { CoinInfo } from '../components/CoinInfo';
import { CoinCounter } from '../components/CoinCounter';
import { vehicleAt } from '../game/engine/collision';
import { getLevel, nextLevelId } from '../game/levels';
import { useGameStore } from '../state/gameStore';
import { usePlayerStore } from '../state/playerStore';
import { COIN_COSTS, COIN_REWARDS } from '../services/coins/types';
import { flush as flushSync } from '../services/sync/syncQueue';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Home, Radius, Spacing } from '../theme/tokens';

const BG = require('../../assets/ui/bg/gameplay_bg.png');

/**
 * Finished button art. The coin cost is PAINTED INTO each one, so nothing is
 * drawn on top and `COIN_COSTS` must stay in step with the pictures:
 * hint 30, undo 20, reset 10, skip 100. Changing a price means new art.
 */
const ACTION_ART = {
  hint: require('../../assets/ui/buttons/hint.png'),
  undo: require('../../assets/ui/buttons/undo.png'),
  reset: require('../../assets/ui/buttons/reset.png'),
  skip: require('../../assets/ui/buttons/skip.png'),
} as const;

/**
 * Anchors measured from the artwork (853 x 1843), as FRACTIONS so they survive
 * `cover`'s crop on any aspect ratio.
 *
 * `FIELD` is the painted playing surface: x 56..796, y 541..1281 — exactly
 * 740 x 740, with its grid lines at perfect sixths. The board canvas is laid
 * straight onto it, so the engine's cells and the painted cells coincide.
 *
 * `SIGN` is the deliberately blank highway sign the level text sits on.
 */
const BG_W = 853;
const BG_H = 1843;
const FIELD = {
  left: 56 / BG_W,
  right: 796 / BG_W,
  top: 541 / BG_H,
  bottom: 1281 / BG_H,
};
const SIGN = {
  left: 223 / BG_W,
  right: 629 / BG_W,
  top: 114 / BG_H,
  bottom: 283 / BG_H,
};

const ACTIONS_HEIGHT = 104;

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export function GameScreen({ route, navigation }: Props) {
  const levelId = route.params.levelId;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const coins = usePlayerStore(s => s.coins);
  const spend = usePlayerStore(s => s.spend);
  const earn = usePlayerStore(s => s.earn);
  const completeLevel = usePlayerStore(s => s.completeLevel);
  const completedLevels = usePlayerStore(s => s.completedLevels);

  const level = useGameStore(s => s.level);
  const state = useGameStore(s => s.state);
  const historyLength = useGameStore(s => s.history.length);
  const blockedAt = useGameStore(s => s.blockedAt);
  const blockedVehicleId = useGameStore(s => s.blockedVehicleId);
  const hintVehicleId = useGameStore(s => s.hintVehicleId);
  const skipped = useGameStore(s => s.skipped);
  const loadLevel = useGameStore(s => s.loadLevel);
  const moveVehicle = useGameStore(s => s.moveVehicle);
  const undo = useGameStore(s => s.undo);
  const reset = useGameStore(s => s.reset);
  const revealHint = useGameStore(s => s.revealHint);
  const skip = useGameStore(s => s.skip);

  useEffect(() => {
    const target = getLevel(levelId);
    if (target) {
      loadLevel(target);
    }
    setAwarded(0);
  }, [levelId, loadLevel]);

  const [awarded, setAwarded] = useState(0);

  /**
   * Award exactly once per level, ever.
   *
   * Two distinct ways this could double-pay, both guarded:
   *
   * 1. `navigation.replace` for "Next level" remounts this screen with the new
   *    levelId while the store still holds the PREVIOUS level's won state for
   *    one render. Without the `level.id !== levelId` check the effect fires
   *    again and pays out a second time for the level just finished.
   * 2. Replaying an already-cleared level would otherwise pay again, which is
   *    a trivial coin farm — clear level 1, replay, repeat.
   */
  const won = state?.status === 'won';
  useEffect(() => {
    if (!won || !level) {
      return;
    }
    if (level.id !== levelId) {
      return; // stale state from the level we just left
    }
    if (completedLevels.includes(level.id)) {
      setAwarded(0);
      return; // already paid for this one
    }
    // A skipped level still unlocks the next one, but pays nothing — see the
    // `skipped` note in gameStore.
    completeLevel(level.id);
    if (skipped) {
      setAwarded(0);
      return;
    }
    earn(COIN_REWARDS.level_complete, 'level_complete');
    setAwarded(COIN_REWARDS.level_complete);
    // Level complete is a natural checkpoint (DECISIONS.md D-004): push the
    // new balance now rather than waiting for the idle timer or backgrounding.
    flushSync();
  }, [won, level, levelId, completedLevels, completeLevel, earn, skipped]);

  const handleCellTap = useCallback(
    (x: number, y: number) => {
      const current = useGameStore.getState().state;
      if (!current) {
        return;
      }
      const vehicle = vehicleAt(current, x, y);
      if (vehicle) {
        moveVehicle(vehicle.id);
      }
    },
    [moveVehicle],
  );

  const [shortfall, setShortfall] = useState<number | null>(null);
  const [deadEnd, setDeadEnd] = useState(false);

  // Derived from the reactive balance rather than coinService, so the buttons
  // dim on the same render that the HUD updates.
  const canAfford = useCallback((cost: number) => coins >= cost, [coins]);

  /**
   * Compute the hint BEFORE charging. If the board has become unsolvable there
   * is no useful move to sell, and taking 30 coins for "sorry, reset" would be
   * the single fastest way to teach players never to buy a hint again.
   */
  const handleHint = useCallback(() => {
    if (!canAfford(COIN_COSTS.hint)) {
      setShortfall(COIN_COSTS.hint);
      return;
    }
    const hint = revealHint();
    if (!hint) {
      setDeadEnd(true);
      return;
    }
    spend(COIN_COSTS.hint, 'hint');
  }, [canAfford, revealHint, spend]);

  const handleSkip = useCallback(() => {
    if (!canAfford(COIN_COSTS.skip)) {
      setShortfall(COIN_COSTS.skip);
      return;
    }
    if (spend(COIN_COSTS.skip, 'skip')) {
      skip();
    }
  }, [canAfford, spend, skip]);

  const handleUndo = useCallback(() => {
    if (historyLength === 0) {
      return;
    }
    if (!canAfford(COIN_COSTS.undo)) {
      setShortfall(COIN_COSTS.undo);
      return;
    }
    if (spend(COIN_COSTS.undo, 'undo')) {
      undo();
    }
  }, [historyLength, canAfford, spend, undo]);

  const handleReset = useCallback(() => {
    setDeadEnd(false);
    if (!canAfford(COIN_COSTS.reset)) {
      setShortfall(COIN_COSTS.reset);
      return;
    }
    if (spend(COIN_COSTS.reset, 'reset')) {
      reset();
    }
  }, [canAfford, spend, reset]);

  const nextId = level ? nextLevelId(level.id) : undefined;

  /**
   * `cover` metrics for the background, so chrome can be pinned to features
   * painted INTO the art — the level text has to land on the green sign, and
   * the sign moves with the crop.
   */
  const bgScale = Math.max(width / BG_W, height / BG_H);
  const bgW = BG_W * bgScale;
  const bgH = BG_H * bgScale;
  const bgX = (width - bgW) / 2;
  const bgY = (height - bgH) / 2;
  // `left`/`top`, not `x`/`y` — React Native silently ignores x/y on a View,
  // which parks the absolute box at the origin instead of on the sign.
  const sign = {
    left: bgX + SIGN.left * bgW,
    top: bgY + SIGN.top * bgH,
    width: (SIGN.right - SIGN.left) * bgW,
    height: (SIGN.bottom - SIGN.top) * bgH,
  };

  // The board is not sized from available space any more — it IS the painted
  // field, mapped through the same crop transform as the sign. Art and grid
  // therefore stay locked together on every screen.
  const field = {
    left: bgX + FIELD.left * bgW,
    top: bgY + FIELD.top * bgH,
    width: (FIELD.right - FIELD.left) * bgW,
    height: (FIELD.bottom - FIELD.top) * bgH,
  };
  const boardSize = Math.min(field.width, field.height);

  if (!level || !state) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Image
        source={BG}
        style={[styles.bg, { width, height }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        style={({ pressed }) => [
          styles.back,
          { top: insets.top + Spacing.sm },
          pressed && styles.pressed,
        ]}>
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>

      <View style={[styles.coins, { top: insets.top + Spacing.sm }]}>
        <CoinCounter compact />
      </View>

      {/* Pinned to the blank sign painted into the background art. */}
      <View style={[styles.sign, sign]} pointerEvents="none">
        <Text style={styles.signTitle} numberOfLines={1}>
          Level {level.id}
        </Text>
        <Text style={styles.signSub} numberOfLines={1}>
          {state.moveCount} {state.moveCount === 1 ? 'move' : 'moves'}
          {level.parMoves !== undefined ? ` · par ${level.parMoves}` : ''}
        </Text>
      </View>

      <View style={[styles.board, { left: field.left, top: field.top }]}>
        <GameBoard
          level={level}
          size={boardSize}
          vehicles={state.vehicles}
          onCellTap={handleCellTap}
          blockedAt={blockedAt}
          blockedVehicleId={blockedVehicleId}
          hintVehicleId={hintVehicleId}
        />
        {deadEnd ? (
          <View style={styles.deadEnd} pointerEvents="none">
            <Text style={styles.deadEndText}>
              No moves left from here — undo or reset.
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[styles.actions, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Action
          art={ACTION_ART.hint}
          label={`Hint, ${COIN_COSTS.hint} coins`}
          affordable={canAfford(COIN_COSTS.hint)}
          onPress={handleHint}
        />
        <Action
          art={ACTION_ART.undo}
          label={`Undo, ${COIN_COSTS.undo} coins`}
          disabled={historyLength === 0}
          affordable={canAfford(COIN_COSTS.undo)}
          onPress={handleUndo}
        />
        <Action
          art={ACTION_ART.reset}
          label={`Reset, ${COIN_COSTS.reset} coins`}
          affordable={canAfford(COIN_COSTS.reset)}
          onPress={handleReset}
        />
        <Action
          art={ACTION_ART.skip}
          label={`Skip, ${COIN_COSTS.skip} coins`}
          affordable={canAfford(COIN_COSTS.skip)}
          onPress={handleSkip}
        />
      </View>

      <CoinInfo
        visible={shortfall !== null}
        needed={shortfall ?? undefined}
        balance={coins}
        onDismiss={() => setShortfall(null)}
      />

      <LevelCompleteModal
        visible={won}
        moveCount={state.moveCount}
        parMoves={level.parMoves}
        coinsAwarded={awarded}
        skipped={skipped}
        hasNextLevel={nextId !== undefined}
        onNext={() => {
          if (nextId !== undefined) {
            navigation.replace('Game', { levelId: nextId });
          }
        }}
        onReplay={reset}
        onHome={() => navigation.navigate('Home')}
      />
    </View>
  );
}

/**
 * `disabled` means the action is meaningless right now (nothing to undo) and is
 * genuinely inert. `affordable` is different: an unaffordable action stays
 * tappable and explains itself, because a dead button reads as a broken UI
 * (DESIGN.md).
 *
 * The art carries the icon AND the price, so this renders no text — only the
 * accessibility label spells it out, since a screen reader cannot read a PNG.
 */
function Action({
  art,
  label,
  onPress,
  disabled,
  affordable = true,
}: {
  art: number;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  affordable?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        (disabled || !affordable) && styles.actionDim,
        pressed && styles.actionPressed,
      ]}>
      <Image
        source={art}
        style={styles.actionImage}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBackground },
  bg: { position: 'absolute', top: 0, left: 0 },

  // Chrome floats over the artwork rather than sitting in a header row: the
  // art already provides the signage this screen's information belongs on.
  back: {
    position: 'absolute',
    left: Spacing.md,
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Home.chrome,
    borderWidth: 2,
    borderColor: Home.chromeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  backArrow: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },
  pressed: { transform: [{ scale: 0.94 }] },
  coins: { position: 'absolute', right: Spacing.md, zIndex: 2 },

  sign: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  signTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  signSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },

  // Absolutely positioned onto the painted field. Its placement comes entirely
  // from the artwork, so there is no flex layout to fight with.
  board: { position: 'absolute', zIndex: 1 },

  actions: {
    marginTop: 'auto',
    zIndex: 2,
    height: ACTIONS_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  // Source art is square (1254x1254).
  actionImage: { width: 70, height: 70 },
  actionDim: { opacity: 0.45 },
  actionPressed: { transform: [{ scale: 0.94 }] },

  deadEnd: {
    position: 'absolute',
    bottom: -Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  deadEndText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
