/**
 * The shared painted backdrop.
 *
 * Home and the game screen each have their own artwork; every other screen
 * borrows the home scene so the app reads as one place rather than a bright
 * game bolted onto flat grey menus.
 *
 * A scrim sits over it: the art is busy and high-contrast, and menu text needs
 * a calmer ground than a city skyline to stay readable.
 */

import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

const BG = require('../../../assets/ui/bg/home.webp');

type Props = { children: React.ReactNode; scrim?: number };

export function ScreenBackground({ children, scrim = 0.68 }: Props) {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.root}>
      {/* Explicit size: an Image with only inset-0 has no definite box, so
          `cover` falls back to intrinsic size treated as dp. See DESIGN.md. */}
      <Image
        source={BG}
        style={[styles.bg, { width, height }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View
        style={[styles.scrim, { backgroundColor: `rgba(20, 26, 38, ${scrim})` }]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#141A26' },
  bg: { position: 'absolute', top: 0, left: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: { flex: 1 },
});
