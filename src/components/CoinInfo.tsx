/**
 * The one place that answers "how do I get coins?".
 *
 * Serves two callers with the same body: the game screen when an assist is
 * unaffordable, and the home screen's + button. Keeping them in one component
 * means the earning routes are listed once — when rewarded ads land (Phase 10),
 * "Watch an ad" is added here and both entry points gain it.
 *
 * DESIGN.md: an unaffordable action stays tappable and explains itself. A dead
 * button reads as a broken UI.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameButton } from './GameButton';
import { COIN_REWARDS } from '../services/coins/types';
import { Colors, Radius, Spacing } from '../theme/tokens';

type Props = {
  visible: boolean;
  balance: number;
  /** Set when the player tried to afford something specific. */
  needed?: number;
  onDismiss: () => void;
};

export function CoinInfo({ visible, balance, needed, onDismiss }: Props) {
  if (!visible) {
    return null;
  }

  const short = needed !== undefined;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {short ? 'Not enough coins' : 'Earning coins'}
        </Text>

        <Text style={styles.body}>
          {short
            ? `That costs ${needed} 🪙 and you have ${balance}.`
            : `You have ${balance} 🪙.`}
        </Text>

        <Text style={styles.hint}>
          Clear a level to earn +{COIN_REWARDS.level_complete} 🪙
        </Text>
        <Text style={styles.note}>
          Daily rewards and rewarded ads are coming soon.
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
    zIndex: 10,
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
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  note: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  button: { alignSelf: 'stretch', marginTop: Spacing.lg },
});
