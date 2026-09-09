/**
 * Level complete.
 *
 * Built on `assets/ui/bg/level_clear.png`, which carries the stars, the
 * "Cleared!" banner and the confetti — so this component renders no title.
 *
 * Appears ~400ms after the last vehicle escapes so the exit animation gets to
 * breathe; the escape is the most satisfying moment in the game and a modal
 * landing on top of it steals that (GAME_DESIGN.md).
 */

import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const PANEL = require('../../assets/ui/bg/level_clear.png');
const PANEL_ASPECT = 1105 / 1423;
/**
 * The three button assets were cropped separately, so their aspect ratios
 * differ (4.44, 4.16, 4.07). Sizing them all from one ratio would leave them
 * visibly mismatched, so each is measured and they are fitted to a COMMON
 * WIDTH — stacked buttons read as tidy when their side edges align, and the
 * small height differences that follow are far less noticeable.
 */
const BUTTON_ART = {
  next: { src: require('../../assets/ui/buttons/next_level.png'), aspect: 1991 / 448 },
  replay: { src: require('../../assets/ui/buttons/replay.png'), aspect: 2075 / 499 },
  home: { src: require('../../assets/ui/buttons/home.png'), aspect: 2114 / 519 },
} as const;

/**
 * The panel's blank stat slot, measured from the artwork: x 240..865,
 * y 509..674 of 1105 x 1423. Text is placed into it as fractions so it stays
 * put at any panel size.
 */
const SLOT = {
  left: 240 / 1105,
  right: 865 / 1105,
  top: 509 / 1423,
  bottom: 674 / 1423,
};
/**
 * The clear band below the stat slot, as fractions of panel height. Buttons
 * are sized to FIT this band rather than to a share of the panel's width —
 * three stacked at 76% width overflowed the panel entirely.
 */
const BUTTONS_TOP = 0.515;
// Stops short of the panel's actual foot (0.9775). Running the band right to
// the edge left the last button touching — and visually spilling past — the
// rounded corner, which reads as overflow even when it technically fits.
const BUTTONS_BOTTOM = 0.935;

const REVEAL_DELAY_MS = 400;

type Props = {
  visible: boolean;
  moveCount: number;
  parMoves?: number;
  coinsAwarded: number;
  /** The board was cleared by paying to Skip, not by solving it. */
  skipped: boolean;
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
  hasNextLevel,
  onNext,
  onReplay,
  onHome,
}: Props) {
  const { width, height } = useWindowDimensions();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || !shown) {
    return null;
  }

  // Explicit size — an Image with only inset-0 has no definite box and falls
  // back to intrinsic size treated as dp (see DESIGN.md).
  const panelW = Math.min(width * 0.96, 440);
  const panelH = panelW / PANEL_ASPECT;
  const maxH = height * 0.82;
  const w = panelH > maxH ? maxH * PANEL_ASPECT : panelW;
  const h = w / PANEL_ASPECT;

  // Type scales with the panel so it holds its proportions on any screen.
  const statSize = w * 0.043;

  // Fit the stack to the band: pick the width whose resulting heights, plus
  // the gaps, exactly fill it. Solved rather than guessed, so the buttons are
  // always as large as the panel allows.
  const buttonArt = hasNextLevel
    ? [BUTTON_ART.next, BUTTON_ART.replay, BUTTON_ART.home]
    : [BUTTON_ART.replay, BUTTON_ART.home];
  const gap = h * 0.012;
  const band = (BUTTONS_BOTTOM - BUTTONS_TOP) * h;
  const inverseAspects = buttonArt.reduce((sum, b) => sum + 1 / b.aspect, 0);
  const buttonW = Math.min(
    (band - gap * (buttonArt.length - 1)) / inverseAspects,
    w * 0.9,
  );

  // A skipped level was never solved, so move count, par and the perfect-solve
  // badge would all be claiming credit the player did not earn.
  const perfect = !skipped && parMoves !== undefined && moveCount <= parMoves;

  return (
    <View style={styles.backdrop}>
      <View style={{ width: w, height: h }}>
        <Image
          source={PANEL}
          style={{ width: w, height: h }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />

        {/* Stats, dropped into the panel's blank slot. */}
        <View
          style={[
            styles.slot,
            {
              left: SLOT.left * w,
              width: (SLOT.right - SLOT.left) * w,
              top: SLOT.top * h,
              height: (SLOT.bottom - SLOT.top) * h,
            },
          ]}
          pointerEvents="none">
          {skipped ? (
            <Text style={[styles.stat, { fontSize: statSize }]}>
              Level unlocked
            </Text>
          ) : (
            <Text style={[styles.stat, { fontSize: statSize }]}>
              {moveCount} {moveCount === 1 ? 'move' : 'moves'}
              {parMoves !== undefined ? ` · par ${parMoves}` : ''}
            </Text>
          )}

          {perfect ? (
            <Text style={[styles.perfect, { fontSize: statSize * 1.05 }]}>
              Perfect solve ⭐
            </Text>
          ) : (
            <Text style={[styles.reward, { fontSize: statSize }]}>
              {coinsAwarded > 0
                ? `+${coinsAwarded} 🪙`
                : skipped
                ? 'No coins for a skip'
                : 'Replay — no coins again'}
            </Text>
          )}
        </View>

        <View style={[styles.buttons, { top: BUTTONS_TOP * h, gap }]}>
          {hasNextLevel ? (
            <ArtButton
              art={BUTTON_ART.next}
              label="Next level"
              width={buttonW}
              onPress={onNext}
            />
          ) : null}
          <ArtButton
            art={BUTTON_ART.replay}
            label={skipped ? 'Try it properly' : 'Replay'}
            width={buttonW}
            onPress={onReplay}
          />
          <ArtButton
            art={BUTTON_ART.home}
            label="Home"
            width={buttonW}
            onPress={onHome}
          />
        </View>
      </View>
    </View>
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
      style={({ pressed }) => [pressed && styles.pressed]}>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 12, 24, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  slot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps both lines off the slot's rounded edges.
    paddingVertical: 6,
  },
  stat: { color: '#FFFFFF', fontWeight: '700' },
  perfect: { color: '#FFD84D', fontWeight: '900', marginTop: 5 },
  reward: { color: '#FFD84D', fontWeight: '800', marginTop: 5 },
  buttons: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pressed: { transform: [{ scale: 0.96 }] },
});
