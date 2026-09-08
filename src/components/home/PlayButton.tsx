/**
 * The primary call to action.
 *
 * Uses the finished button art (`assets/ui/buttons/play.png`), which has the
 * pill, rim, chevron and "PLAY" all baked in. Nothing is drawn on top of it —
 * the level number goes UNDERNEATH, because the artwork fills its own pill and
 * a subtitle inside would collide with the lettering.
 */

import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Spacing } from '../../theme/tokens';

const PLAY = require('../../../assets/ui/buttons/play.png');
/** Source art is 866 x 288. */
const PLAY_ASPECT = 866 / 288;

/** Fraction of the screen the button spans, and the cap on large screens. */
const WIDTH_FRACTION = 0.68;
const MAX_WIDTH = 300;

type Props = {
  levelId: number;
  resuming: boolean;
  onPress: () => void;
};

export function PlayButton({ levelId, resuming, onPress }: Props) {
  const { width } = useWindowDimensions();
  // Sized explicitly. `contain` means a mis-measure letterboxes rather than
  // crops, which is the safer failure for artwork with a baked-in rim.
  const buttonWidth = Math.min(width * WIDTH_FRACTION, MAX_WIDTH);
  const buttonHeight = buttonWidth / PLAY_ASPECT;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Play level ${levelId}`}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <Image
          source={PLAY}
          style={{ width: buttonWidth, height: buttonHeight }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Pressable>

      <Text style={styles.sub}>
        {resuming ? 'CONTINUE · ' : ''}LEVEL {levelId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pressed: { transform: [{ scale: 0.96 }] },
  sub: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: Spacing.xs,
    // The caption sits on the road, whose tone varies with the art. A shadow
    // keeps it readable without adding a plate behind it.
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
