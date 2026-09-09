/**
 * Home top bar: settings, coin balance, add-coins.
 *
 * Sits over the sky portion of the background art. The settings and plus
 * buttons are finished artwork (`assets/ui/icons/`) with their own moulded
 * rims, so nothing is drawn behind them — only the coin pill is rendered.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlayerStore } from '../../state/playerStore';
import { Home, Radius, Spacing } from '../../theme/tokens';

const SETTINGS = require('../../../assets/ui/icons/settings.png');
const PLUS = require('../../../assets/ui/icons/plus.png');

/** Source art is 1254x1254 and 1286x1223 — the plus is not quite square. */
const SETTINGS_ASPECT = 1254 / 1254;
const PLUS_ASPECT = 1286 / 1223;

const BUTTON = 48;
/**
 * The plus is TALLER than the bar and overhangs its end, so the pill reads as
 * a bar strung between its caps rather than a container with icons inside.
 *
 * The left end is still the 🪙 emoji, which cannot do the same: a glyph does
 * not fill its em box, so it always sits inside the bar however large the font.
 * When `assets/ui/icons/coin.png` lands, swap the Text for an Image sized like
 * PLUS_SIZE and it will cap the left end properly.
 */
const PLUS_SIZE = 42;
const PILL_HEIGHT = 34;

type Props = {
  onSettings: () => void;
  /** Opens the "how do I get coins" sheet. Becomes the shop entry later. */
  onAddCoins: () => void;
};

export function TopBar({ onSettings, onAddCoins }: Props) {
  const coins = usePlayerStore(s => s.coins);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onSettings}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
        style={({ pressed }) => pressed && styles.pressed}>
        <Image
          source={SETTINGS}
          style={{ width: BUTTON, height: BUTTON / SETTINGS_ASPECT }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Pressable>

      <View style={styles.spacer} />

      <View style={styles.coinPill} accessibilityLabel={`${coins} coins`}>
        {/* Caps the left end, mirroring the plus. Swap this Text for an
            <Image source={COIN} .../> when the coin asset lands — the layout
            already reserves the right space for it. */}
        <Text style={styles.coinIcon}>🪙</Text>

        <Text style={styles.coinText}>{coins.toLocaleString()}</Text>

        {/* Caps the pill's right end rather than sitting inside its padding —
            otherwise the pill's navy frames the button on all four sides. It
            overhangs slightly so it reads as attached, as in the reference. */}
        <Pressable
          onPress={onAddCoins}
          accessibilityRole="button"
          accessibilityLabel="Get more coins"
          hitSlop={10}
          style={({ pressed }) => [styles.plusWrap, pressed && styles.pressed]}>
          <Image
            source={PLUS}
            style={{ width: PLUS_SIZE, height: PLUS_SIZE / PLUS_ASPECT }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Settings hard left, coins hard right — the pill is not centred, so the
  // title artwork below it is never competing with chrome for the middle.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  spacer: { flex: 1 },
  pressed: { transform: [{ scale: 0.92 }] },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: PILL_HEIGHT,
    backgroundColor: Home.chrome,
    borderWidth: 2,
    borderColor: Home.chromeBorder,
    borderRadius: Radius.md,
    paddingLeft: Spacing.md,
    // No right padding: the plus provides the end cap itself.
    paddingRight: 0,
  },
  plusWrap: { marginRight: -5 },
  coinIcon: { fontSize: 22},
  coinText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginRight: 2,
  },
});
