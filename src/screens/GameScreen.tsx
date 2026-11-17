import { breadcrumb } from "../services/diagnostics/client";
import { ads } from "../services/ads/adService";
import { BackButton } from "../components/navigation/BackButton";
/**
 * The gameplay screen.
 *
 * The board is the screen: it takes the largest square that fits between the
 * header and the action row (DESIGN.md). Chrome is ordinary React Native —
 * only the board is Skia — which keeps text selectable, accessible and cheap.
 */

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { GameBoard } from "../game/rendering/GameBoard";
import { LevelCompleteModal } from "../components/LevelCompleteModal";
import { CoinInfo } from "../components/CoinInfo";
import { CoinCounter } from "../components/CoinCounter";
import { vehicleAt } from "../game/engine/collision";
import {
  useLevelCatalogStore,
  followingLevelId,
} from "../state/levelCatalogStore";
import { canPlayLevel } from "../game/levels/progression";
import { useGameStore } from "../state/gameStore";
import { usePlayerStore } from "../state/playerStore";
import { COIN_COSTS } from "../services/coins/types";
import { flush as flushSync } from "../services/sync/syncQueue";
import type { RootStackParamList } from "../navigation/types";
import { Colors, Spacing } from "../theme/tokens";
import {
  canUseEmulatorQA,
  recordQABoard,
  recordQAMetric,
} from "../services/debug/emulatorQA";
import { computeHint } from "../game/engine/hint";
import { play } from "../services/audio/audioService";

import { gameplayLayout, ACTION_SIZE } from "../game/rendering/screenLayout";

const BG = require("../../assets/ui/bg/gameplay_bg.webp");

/**
 * Finished button art. The coin cost is PAINTED INTO each one, so nothing is
 * drawn on top and `COIN_COSTS` must stay in step with the pictures:
 * hint 30, undo 20 and skip 100. Restart has a live price label.
 */
const ACTION_ART = {
  hint: require("../../assets/ui/buttons/hint.webp"),
  undo: require("../../assets/ui/buttons/undo.webp"),
  reset: require("../../assets/ui/buttons/reset.webp"),
  skip: require("../../assets/ui/buttons/skip.webp"),
} as const;

type Props = NativeStackScreenProps<RootStackParamList, "Game">;

export function GameScreen({ route, navigation }: Props) {
  const levelId = route.params.levelId;
  const preview = canUseEmulatorQA() && route.params.preview === true;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const coins = usePlayerStore((s) => s.coins);
  const spend = usePlayerStore((s) => s.spend);
  const saveLevelResult = usePlayerStore((s) => s.saveLevelResult);
  const completedLevels = usePlayerStore((s) => s.completedLevels);

  const level = useGameStore((s) => s.level);
  const state = useGameStore((s) => s.state);
  const historyLength = useGameStore((s) => s.history.length);
  const blockedAt = useGameStore((s) => s.blockedAt);
  const blockedVehicleId = useGameStore((s) => s.blockedVehicleId);
  const hintVehicleId = useGameStore((s) => s.hintVehicleId);
  const skipped = useGameStore((s) => s.skipped);
  const loadLevel = useGameStore((s) => s.loadLevel);
  const moveVehicle = useGameStore((s) => s.moveVehicle);
  const undo = useGameStore((s) => s.undo);
  const reset = useGameStore((s) => s.reset);
  const revealHint = useGameStore((s) => s.revealHint);
  const skip = useGameStore((s) => s.skip);

  const allLevels = useLevelCatalogStore((s) => s.levels);
  const target =
    preview || canPlayLevel(levelId, allLevels, completedLevels)
      ? allLevels.find((item) => item.id === levelId)
      : undefined;
  const following = followingLevelId(allLevels, levelId);
  const nextId =
    following &&
    (preview || canPlayLevel(following, allLevels, completedLevels))
      ? following
      : undefined;

  useEffect(() => {
    if (!target) {
      navigation.replace("LevelSelect");
      return;
    }
    loadLevel(target);
    setAwarded(null);
  }, [levelId, loadLevel, target, navigation]);

  const [awarded, setAwarded] = useState<number | null>(null);
  useEffect(() => {
    if (!preview || state?.levelId !== levelId || state.moveCount !== 0) {
      return;
    }
    const timer = setTimeout(() => {
      const started = performance.now();
      const hint = computeHint(state);
      recordQAMetric("hint", {
        levelId,
        ms: performance.now() - started,
        found: Boolean(hint),
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [preview, levelId, state]);

  const won = state?.status === "won";
  const resultsConsumed = useRef(false);
  useEffect(() => {
    if (!won) resultsConsumed.current = false;
  }, [won, levelId]);
  const leaveResults = (after: () => void) => {
    if (resultsConsumed.current) return;
    resultsConsumed.current = true;
    if (!preview && !skipped) ads.showInterstitial(after);
    else after();
  };
  const settledBoard = useRef<typeof state>(null);
  useEffect(() => {
    if (!won) {
      settledBoard.current = null;
      setAwarded(null);
      return;
    }
    if (
      !level ||
      !state ||
      level.id !== levelId ||
      state.levelId !== levelId ||
      settledBoard.current === state
    )
      return;

    const amount = preview ? 0 : saveLevelResult(level, state, skipped);
    if (amount === null) return;
    settledBoard.current = state;
    setAwarded(amount);
    if (amount > 0) play("coin");
    if (!preview) flushSync();
  }, [preview, won, level, state, levelId, saveLevelResult, skipped]);

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
    [moveVehicle]
  );

  const [shortfall, setShortfall] = useState<number | null>(null);
  const [deadEnd, setDeadEnd] = useState(false);

  // Derived from the reactive balance rather than coinService, so the buttons
  // dim on the same render that the HUD updates.
  const canAfford = useCallback(
    (cost: number) => preview || coins >= cost,
    [coins, preview]
  );

  /**
   * Compute the hint BEFORE charging. If the board has become unsolvable there
   * is no useful move to sell, and taking 30 coins for "sorry, reset" would be
   * the single fastest way to teach players never to buy a hint again.
   */
  const handleHint = useCallback(() => {
    breadcrumb("game.hint");
    if (!canAfford(COIN_COSTS.hint)) {
      setShortfall(COIN_COSTS.hint);
      return;
    }
    const hint = revealHint();
    if (!hint) {
      setDeadEnd(true);
      return;
    }
    if (!preview) {
      spend(COIN_COSTS.hint, "hint");
    }
  }, [canAfford, revealHint, spend, preview]);

  const handleSkip = useCallback(() => {
    breadcrumb("game.skip");
    if (!canAfford(COIN_COSTS.skip)) {
      setShortfall(COIN_COSTS.skip);
      return;
    }
    if (preview || spend(COIN_COSTS.skip, "skip")) {
      skip();
    }
  }, [canAfford, spend, skip, preview]);

  const handleUndo = useCallback(() => {
    breadcrumb("game.undo");
    if (historyLength === 0) {
      return;
    }
    if (!canAfford(COIN_COSTS.undo)) {
      setShortfall(COIN_COSTS.undo);
      return;
    }
    if (preview || spend(COIN_COSTS.undo, "undo")) {
      undo();
    }
  }, [historyLength, canAfford, spend, undo, preview]);

  const restartBoard = useCallback(() => {
    setDeadEnd(false);
    reset();
  }, [reset]);

  const handleReset = useCallback(() => {
    const board = useGameStore.getState().state;
    if (
      !board ||
      board.levelId !== levelId ||
      board.status !== "playing" ||
      board.moveCount === 0
    )
      return;
    breadcrumb("game.reset");
    if (preview || spend(COIN_COSTS.reset, "reset")) {
      restartBoard();
    } else {
      setShortfall(COIN_COSTS.reset);
    }
  }, [levelId, preview, restartBoard, spend]);

  const { background, sign, boardSize, boardLeft, boardTop, actionsHeight } =
    gameplayLayout(width, height, insets, level?.gridSize ?? 6);

  if (canUseEmulatorQA()) {
    recordQABoard({
      left: boardLeft,
      top: boardTop,
      size: boardSize,
      gridSize: level?.gridSize ?? 6,
    });
  }

  if (!level || !state) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Image
        source={BG}
        style={[styles.bg, background]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <BackButton
        onPress={() => navigation.goBack()}
        style={[styles.back, { top: insets.top + Spacing.sm }]}
      />

      <View style={[styles.coins, { top: insets.top + Spacing.sm }]}>
        <CoinCounter compact />
      </View>

      {/* Pinned to the blank sign painted into the background art. */}
      <View style={[styles.sign, sign]} pointerEvents="none">
        <Text
          style={styles.signTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          Level {level.id}
        </Text>
        <Text
          style={styles.signSub}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {state.moveCount} {state.moveCount === 1 ? "move" : "moves"}
          {level.parMoves !== undefined ? ` · par ${level.parMoves}` : ""}
        </Text>
      </View>

      <View style={[styles.board, { left: boardLeft, top: boardTop }]}>
        <GameBoard
          key={level.id}
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
        style={[
          styles.actions,
          { height: actionsHeight, paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
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
          label={`Restart level, ${COIN_COSTS.reset} coins`}
          price={COIN_COSTS.reset}
          disabled={state.moveCount === 0 || won}
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
        onBuyCoins={() => navigation.navigate("BuyCoins")}
        onAds={() => {
          setShortfall(null);
          navigation.navigate("AdBenefits");
        }}
      />

      <LevelCompleteModal
        visible={won && state.levelId === levelId && awarded !== null}
        moveCount={state.moveCount}
        parMoves={level.parMoves}
        coinsAwarded={awarded ?? 0}
        preview={preview}
        skipped={skipped}
        hasNextLevel={nextId !== undefined}
        onNext={() =>
          leaveResults(() => {
            if (nextId !== undefined)
              navigation.replace("Game", { levelId: nextId, preview });
          })
        }
        onReplay={() => leaveResults(restartBoard)}
        onHome={() => leaveResults(() => navigation.popTo("Home"))}
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
 * Restart overlays its live price on the existing button art.
 */
function Action({
  art,
  label,
  onPress,
  disabled,
  affordable = true,
  price,
}: {
  art: number;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  affordable?: boolean;
  price?: number;
}) {
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              play("tap");
              onPress();
            }
          : undefined
      }
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        (disabled || !affordable) && styles.actionDim,
        pressed && styles.actionPressed,
      ]}
    >
      <Image
        source={art}
        style={styles.actionImage}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {price !== undefined ? (
        <View pointerEvents="none" style={styles.actionPrice}>
          <Image
            source={require("../../assets/ui/icons/coin.webp")}
            style={styles.priceCoin}
            accessible={false}
          />
          <Text style={styles.priceText} allowFontScaling={false}>
            {price}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBackground },
  bg: { position: "absolute", top: 0, left: 0 },

  // Chrome floats over the artwork rather than sitting in a header row: the
  // art already provides the signage this screen's information belongs on.
  back: { position: "absolute", left: Spacing.md, zIndex: 2 },
  coins: { position: "absolute", right: Spacing.md, zIndex: 2 },

  sign: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  signTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  signSub: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },

  // Absolutely positioned onto the painted field. Its placement comes entirely
  // from the artwork, so there is no flex layout to fight with.
  board: { position: "absolute", zIndex: 1 },

  actions: {
    marginTop: "auto",
    zIndex: 2,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-start",
  },
  // Source art is square (1254x1254).
  actionImage: { width: ACTION_SIZE, height: ACTION_SIZE },
  actionPrice: {
    position: "absolute",
    top: 43,
    left: 14,
    width: 42,
    height: 16,
    borderRadius: 9,
    backgroundColor: "#660e07",
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  priceCoin: { width: 14, height: 14 },
  priceText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  actionDim: { opacity: 0.45 },
  actionPressed: { transform: [{ scale: 0.94 }] },

  deadEnd: {
    position: "absolute",
    bottom: -Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  deadEndText: {
    color: "#FFFFFF",
    fontSize: 13,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
