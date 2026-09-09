/**
 * Coin balance.
 *
 * Subscribes with a selector so it re-renders only when the balance actually
 * changes — a board update must never touch this (ARCHITECTURE.md).
 *
 * The value counts up rather than snapping. A number that jumps is easy to
 * miss; one that climbs draws the eye to the reward (DESIGN.md).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
const COIN = require('../../assets/ui/icons/coin.png');

import { usePlayerStore } from '../state/playerStore';
import { Colors, Radius, Spacing } from '../theme/tokens';

const COUNT_MS = 420;
const STEPS = 14;

/**
 * Steps toward the target rather than animating per frame. Fourteen setState
 * calls over 420ms is imperceptibly different from sixty, and keeps the JS
 * thread free while the board is animating.
 */
function useCountUp(target: number): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const start = from.current;
    if (start === target) {
      return;
    }

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / STEPS;
      if (step >= STEPS) {
        from.current = target;
        setShown(target);
        clearInterval(timer);
        return;
      }
      setShown(Math.round(start + (target - start) * progress));
    }, COUNT_MS / STEPS);

    return () => {
      clearInterval(timer);
      // Land on the true value if we are interrupted mid-count, so the HUD can
      // never be left showing a number that was only ever a waypoint.
      from.current = target;
      setShown(target);
    };
  }, [target]);

  return shown;
}

export function CoinCounter({ compact = false }: { compact?: boolean }) {
  const coins = usePlayerStore(s => s.coins);
  const shown = useCountUp(coins);

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <Image
        source={COIN}
        style={compact ? styles.coinSmall : styles.coin}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={styles.text} accessibilityLabel={`${coins} coins`}>
        {shown.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.boardBackground,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  compact: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  coin: { width: 24, height: 24 },
  coinSmall: { width: 20, height: 20 },
  text: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
});
