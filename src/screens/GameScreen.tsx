/**
 * The gameplay screen.
 *
 * The board is the screen: it takes the largest square that fits between the
 * header and the action row (DESIGN.md). Chrome is ordinary React Native —
 * only the board is Skia — which keeps text selectable, accessible and cheap.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { NotEnoughCoins } from '../components/NotEnoughCoins';
import { CoinCounter } from '../components/CoinCounter';
import { vehicleAt } from '../game/engine/collision';
import { getLevel, nextLevelId } from '../game/levels';
import { useGameStore } from '../state/gameStore';
import { usePlayerStore } from '../state/playerStore';
import { COIN_COSTS, COIN_REWARDS } from '../services/coins/types';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Radius, Spacing } from '../theme/tokens';

const HEADER_HEIGHT = 56;
const ACTIONS_HEIGHT = 88;

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

  const available =
    height - insets.top - insets.bottom - HEADER_HEIGHT - ACTIONS_HEIGHT;
  const boardSize = Math.min(width - Spacing.lg * 2, available);

  if (!level || !state) {
    return <View style={styles.container} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={styles.headerCentre}>
          <Text style={styles.title}>Level {level.id}</Text>
          <Text style={styles.moves}>
            {state.moveCount} {state.moveCount === 1 ? 'move' : 'moves'}
            {level.parMoves !== undefined ? ` · par ${level.parMoves}` : ''}
          </Text>
        </View>
        <CoinCounter compact />
      </View>

      <View style={styles.boardWrap}>
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

      <View style={[styles.actions, { paddingBottom: insets.bottom }]}>
        <Action
          label="💡"
          caption={String(COIN_COSTS.hint)}
          affordable={canAfford(COIN_COSTS.hint)}
          onPress={handleHint}
        />
        <Action
          label="↩"
          caption={String(COIN_COSTS.undo)}
          disabled={historyLength === 0}
          affordable={canAfford(COIN_COSTS.undo)}
          onPress={handleUndo}
        />
        <Action
          label="🔄"
          caption={String(COIN_COSTS.reset)}
          affordable={canAfford(COIN_COSTS.reset)}
          onPress={handleReset}
        />
        <Action
          label="⏭"
          caption={String(COIN_COSTS.skip)}
          affordable={canAfford(COIN_COSTS.skip)}
          onPress={handleSkip}
        />
      </View>

      <NotEnoughCoins
        visible={shortfall !== null}
        needed={shortfall ?? 0}
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
 */
function Action({
  label,
  caption,
  onPress,
  disabled,
  affordable = true,
}: {
  label: string;
  caption: string;
  onPress?: () => void;
  disabled?: boolean;
  affordable?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        (disabled || !affordable) && styles.actionDisabled,
        pressed && styles.actionPressed,
      ]}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionCaption}>🪙 {caption}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBackground },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  back: { color: Colors.textSecondary, fontSize: 32, width: 40 },
  headerCentre: { alignItems: 'center' },
  title: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  moves: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: {
    height: ACTIONS_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.boardBackground,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 64,
    minHeight: 56,
  },
  deadEnd: {
    position: 'absolute',
    bottom: -Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  deadEndText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  actionDisabled: { opacity: 0.4 },
  actionPressed: { transform: [{ scale: 0.96 }] },
  actionLabel: { fontSize: 22 },
  actionCaption: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
});
