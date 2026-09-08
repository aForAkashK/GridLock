/**
 * The wide banner beneath the tiles.
 *
 * The reference fills this slot with an "Explore new cities" promo for
 * environments that do not exist yet. Rather than advertise something
 * unbuildable, the same shape carries real progress — which is genuinely what
 * a returning player wants to see first.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Home, Radius, Spacing } from '../../theme/tokens';

type Props = { completed: number; total: number };

export function ProgressBanner({ completed, total }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View style={styles.banner}>
      <Text style={styles.emoji}>🏁</Text>
      <View style={styles.body}>
        <Text style={styles.title}>
          {completed} of {total} levels cleared
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>
      <Text style={styles.pct}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Home.banner,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  emoji: { fontSize: 21 },
  body: { flex: 1, gap: 6 },
  title: {
    color: Home.bannerInk,
    fontSize: 13,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(74, 69, 83, 0.18)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Home.playBottom,
  },
  pct: {
    color: Home.bannerInk,
    fontSize: 15,
    fontWeight: '900',
    minWidth: 40,
    textAlign: 'right',
  },
});
