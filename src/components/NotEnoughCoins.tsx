/**
 * Shown when the player taps an assist they cannot afford.
 *
 * DESIGN.md: an unaffordable button dims but stays tappable, and leads to the
 * ways of earning rather than doing nothing. A dead button teaches the player
 * that the UI is broken; this teaches them how the economy works.
 *
 * When rewarded ads land (Phase 10) the "Watch an ad" option belongs here —
 * this is deliberately the single place that answers "how do I get coins?".
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameButton } from './GameButton';
import { COIN_REWARDS } from '../services/coins/types';
import { Colors, Radius, Spacing } from '../theme/tokens';

type Props = {
  visible: boolean;
  needed: number;
  balance: number;
  onDismiss: () => void;
};

export function NotEnoughCoins({ visible, needed, balance, onDismiss }: Props) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>Not enough coins</Text>
        <Text style={styles.body}>
          That costs {needed} 🪙 and you have {balance}.
        </Text>
        <Text style={styles.hint}>
          Clear a level to earn +{COIN_REWARDS.level_complete} 🪙.
        </Text>
        <GameButton
          label="Got it"
          variant="primary"
          onPress={onDismiss}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.screenBackground,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  body: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center' },
  hint: {
    color: Colors.coin,
    fontSize: 15,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  button: { alignSelf: 'stretch', marginTop: Spacing.lg },
});
