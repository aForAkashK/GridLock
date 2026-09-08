/**
 * Shop. Not in MVP v0.1 (PRD §29) — the screen exists so navigation is
 * complete, but there is nothing to sell yet.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ScreenBackground } from '../components/home/ScreenBackground';
import { Spacing } from '../theme/tokens';

export function ShopScreen() {
  return (
    <ScreenBackground>
      <Text style={styles.text}>Coming soon</Text>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: '60%',
    paddingHorizontal: Spacing.lg,
  },
});
