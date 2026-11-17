/**
 * Level complete.
 *
 * Appears ~400ms after the last vehicle escapes so the exit animation gets to
 * breathe; the escape is the most satisfying moment in the game and a modal
 * landing on top of it steals that (GAME_DESIGN.md).
 */

import React, { useEffect, useRef, useState } from "react";
import { LevelStars } from "./LevelStars";
import { rateSolve } from "../services/levels/ratings";
import { GameTypography } from "../theme/typography";
import { breadcrumb, diagnosticContext } from "../services/diagnostics/client";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const COIN = require("../../assets/ui/icons/coin.webp");
const RESULT_ART = {
  clear: {
    src: require("../../assets/ui/panels/result_clear.webp"),
    title: "Level Complete!",
    aspect: 2 / 3,
  },
  perfect: {
    src: require("../../assets/ui/panels/result_perfect.webp"),
    title: "Perfect Solve!",
    aspect: 2 / 3,
  },
  skip: {
    src: require("../../assets/ui/panels/result_skipped.webp"),
    title: "Level Skipped",
    aspect: 2 / 3,
  },
} as const;

/**
 * The three button assets were cropped separately, so their aspect ratios
 * differ (4.44, 4.16, 4.07). Sizing them all from one ratio would leave them
 * visibly mismatched, so each is measured and they are fitted to a COMMON
 * WIDTH — stacked buttons read as tidy when their side edges align, and the
 * small height differences that follow are far less noticeable.
 */
const BUTTON_ART = {
  next: {
    src: require("../../assets/ui/buttons/next_level.webp"),
    aspect: 1991 / 448,
  },
  replay: {
    src: require("../../assets/ui/buttons/replay.webp"),
    aspect: 2075 / 499,
  },
  home: {
    src: require("../../assets/ui/buttons/home.webp"),
    aspect: 2114 / 519,
  },
} as const;

const REVEAL_DELAY_MS = 400;

type Props = {
  visible: boolean;
  moveCount: number;
  parMoves?: number;
  coinsAwarded: number;
  /** The board was cleared by paying to Skip, not by solving it. */
  skipped: boolean;
  preview?: boolean;
  hasNextLevel: boolean;
  onNext: () => void;
  onReplay: () => void;
  onHome: () => void;
};

export function LevelCompleteModal({
  visible,
  moveCount,
  parMoves,
  coinsAwarded,
  skipped,
  preview = false,
  hasNextLevel,
  onNext,
  onReplay,
  onHome,
}: Props) {
  const { width, height } = useWindowDimensions();
  const [shown, setShown] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const leaving = useRef(false);
  const frame = useRef<number | null>(null);
  const finishDismiss = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    frame.current = null;
    action?.();
  };
  const leave = (action: () => void) => {
    if (leaving.current) return;
    breadcrumb("completion.action", {
      reason:
        action === onNext ? "next" : action === onReplay ? "replay" : "home",
    });
    diagnosticContext({ completionVisible: false });
    leaving.current = true;
    pendingAction.current = action;
    setShown(false);
    // Dismiss the native window before navigation or an SDK ad presentation.
    if (Platform.OS !== "ios")
      frame.current = requestAnimationFrame(finishDismiss);
  };
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      pendingAction.current = null;
    },
    []
  );

  useEffect(() => {
    if (!visible) {
      diagnosticContext({ completionVisible: false });
      leaving.current = false;
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  const rating = skipped ? 0 : rateSolve(moveCount, parMoves);
  const art = RESULT_ART[skipped ? "skip" : rating === 3 ? "perfect" : "clear"];
  // Alignment follows the 512×768 art. Scores use live round values.
  const panelWidth = Math.min(width - 20, height * 0.89 * art.aspect, 420);
  const panelHeight = panelWidth / art.aspect;
  const buttons = hasNextLevel
    ? [BUTTON_ART.next, BUTTON_ART.replay, BUTTON_ART.home]
    : [BUTTON_ART.replay, BUTTON_ART.home];
  const gap = panelHeight * 0.012;
  const buttonW = Math.min(
    panelWidth * 0.82,
    (panelHeight * 0.345 - gap * (buttons.length - 1)) /
      buttons.reduce((total, button) => total + 1 / button.aspect, 0)
  );
  const reward = preview ? "Practice round" : `+${coinsAwarded} coins earned`;

  return (
    <Modal
      visible={visible && shown}
      transparent
      animationType={Platform.OS === "ios" ? "fade" : "none"}
      statusBarTranslucent
      hardwareAccelerated
      onShow={() => {
        diagnosticContext({ completionVisible: true });
        breadcrumb("completion.presented");
      }}
      onRequestClose={() => leave(onHome)}
      onDismiss={finishDismiss}
    >
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View style={{ width: panelWidth, height: panelHeight }}>
          <Image
            source={art.src}
            style={{ width: panelWidth, height: panelHeight }}
            resizeMode="stretch"
            fadeDuration={0}
            accessible
            accessibilityRole="header"
            accessibilityLabel={art.title}
            accessibilityIgnoresInvertColors
          />
          {!skipped ? (
            <>
              <View
                accessible
                accessibilityLabel={`${rating} of 3 stars`}
                style={[
                  styles.starSlot,
                  { top: panelHeight * 0.239, height: panelHeight * 0.15 },
                ]}
              >
                <LevelStars
                  rating={rating}
                  size={panelWidth * 0.195}
                  celebration
                />
              </View>
              <View
                style={[
                  styles.statSlot,
                  { top: panelHeight * 0.401, height: panelHeight * 0.071 },
                ]}
              >
                <Text
                  style={[styles.stat, { fontSize: panelWidth * 0.052 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {moveCount} {moveCount === 1 ? "move" : "moves"}
                  {parMoves !== undefined ? ` · par ${parMoves}` : ""}
                </Text>
              </View>
            </>
          ) : null}
          <View
            style={[
              styles.rewardSlot,
              {
                top: panelHeight * (skipped ? 0.389 : 0.487),
                height: panelHeight * 0.087,
              },
            ]}
          >
            <Image
              source={COIN}
              style={{ width: panelWidth * 0.088, height: panelWidth * 0.088 }}
              accessible={false}
            />
            <Text
              style={[styles.reward, { fontSize: panelWidth * 0.059 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {reward}
            </Text>
          </View>
          <View
            style={[
              styles.buttons,
              { bottom: panelHeight * (hasNextLevel ? 0.061 : 0.12), gap },
            ]}
          >
            {hasNextLevel ? (
              <ArtButton
                art={BUTTON_ART.next}
                label="Next level"
                width={buttonW}
                onPress={() => leave(onNext)}
              />
            ) : null}
            <ArtButton
              art={BUTTON_ART.replay}
              label={skipped ? "Try it properly" : "Replay"}
              width={buttonW}
              onPress={() => leave(onReplay)}
            />
            <ArtButton
              art={BUTTON_ART.home}
              label="Home"
              width={buttonW}
              onPress={() => leave(onHome)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** The art carries the wording, so only the a11y label spells it out. */
function ArtButton({
  art,
  label,
  width,
  onPress,
}: {
  art: { src: number; aspect: number };
  label: string;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Image
        source={art.src}
        style={{ width, height: width / art.aspect }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(6, 12, 24, 0.68)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  starSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  statSlot: {
    position: "absolute",
    left: "21%",
    right: "21%",
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#082655",
    borderColor: "#3a9cec",
    borderWidth: 1.5,
    borderRadius: 30,
  },
  stat: { color: "#e8f6ff", fontWeight: "700", textAlign: "center" },
  rewardSlot: {
    position: "absolute",
    left: "15%",
    right: "15%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
    backgroundColor: "#062449",
    borderColor: "#ffe599",
    borderWidth: 1.5,
    borderRadius: 30,
  },
  reward: {
    flexShrink: 1,
    fontFamily: GameTypography.display,
    color: "#ffe157",
    textAlign: "center",
  },
  buttons: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pressed: { transform: [{ scale: 0.96 }] },
});
