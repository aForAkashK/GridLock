/**
 * Shop. Not in MVP v0.1 (PRD §29) — the screen exists so navigation is
 * complete, but there is nothing to sell yet.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '../theme/tokens';

export function ShopScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  text: { color: Colors.textSecondary, fontSize: 16 },
});
