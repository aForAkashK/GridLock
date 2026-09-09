/**
 * The coin balance pill.
 *
 * Built as a bar strung BETWEEN two end caps, not as a container with icons
 * inside it — the coin overhangs the left end and the plus caps the right, so
 * the pill has no horizontal padding of its own.
 *
 * Shared by every screen that shows a balance, so the geometry and the coin's
 * tilt are defined once. Pass `onAddCoins` to include the plus; omit it on
 * screens where buying coins is not offered.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlayerStore } from '../state/playerStore';
import { Home, Radius, Spacing } from '../theme/tokens';

const COIN = require('../../assets/ui/icons/coin.png');
const PLUS = require('../../assets/ui/icons/plus.png');

/** Source art is 1286x1223 — the plus is not quite square. */
const PLUS_ASPECT = 1286 / 1223;

const PILL_HEIGHT = 34;
const COIN_SIZE = 54;
const PLUS_SIZE = 42;

type Props = {
  /** Shows the plus cap when provided. */
  onAddCoins?: () => void;
  /**
   * Scales the whole pill. Level select needs ~0.8 so it clears the painted
   * "Levels" sign, which is baked into the background and cannot move.
   */
  scale?: number;
};

export function CoinPill({ onAddCoins, scale = 1 }: Props) {
  const coins = usePlayerStore(s => s.coins);

  const coinSize = COIN_SIZE * scale;
  const plusSize = PLUS_SIZE * scale;
  const overhang = coinSize * 0.42;

  return (
    <View
      style={[
        styles.pill,
        { height: PILL_HEIGHT * scale, paddingLeft: overhang },
      ]}
      accessibilityLabel={`${coins} coins`}>
      <Image
        source={COIN}
        style={[
          styles.coin,
          { width: coinSize, height: coinSize, marginLeft: -overhang + -20 },
        ]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />

      <Text
        style={[
          styles.count,
          { fontSize: 17 * scale, minWidth: 44 * scale },
          !onAddCoins && styles.countPadded,
        ]}>
        {coins.toLocaleString()}
      </Text>

      {onAddCoins ? (
        <Pressable
          onPress={onAddCoins}
          accessibilityRole="button"
          accessibilityLabel="Get more coins"
          hitSlop={10}
          style={({ pressed }) => [styles.plusWrap, pressed && styles.pressed]}>
          <Image
            source={PLUS}
            style={{ width: plusSize, height: plusSize / PLUS_ASPECT }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Home.chrome,
    borderWidth: 2,
    borderColor: Home.chromeBorder,
    borderRadius: Radius.md,
    // Left padding matches the overhang (set inline, since it scales) so the
    // count cannot slide under the coin. No right padding: the plus is the cap.
    paddingRight: 0,
  },
  coin: {
    marginRight: -2,
    // Tilted on BOTH axes: leaning back (X) and turned to one side (Y). One
    // axis alone reads as a squashed circle; two together make it sit in space.
    //
    // `perspective` must come first, or the rotations are orthographic and
    // just scale the image instead of foreshortening it.
    transform: [
      { perspective: 420 },
      { rotateX: '-22deg' },
      { rotateY: '30deg' },
    ],
  },
  count: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginRight: Spacing.sm,
    textAlign: 'center',
  },
  /** Without a plus cap the bar needs its own right padding. */
  countPadded: { marginRight: Spacing.md },
  plusWrap: { marginRight: -5 },
  pressed: { transform: [{ scale: 0.92 }] },
});
