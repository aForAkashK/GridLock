/**
 * Home top bar: settings on the left, coin balance on the right.
 *
 * Both are finished artwork with their own moulded rims, so nothing is drawn
 * behind them. The pill itself lives in `CoinPill` — shared with every other
 * screen that shows a balance.
 */

import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { CoinPill } from "../CoinPill";
import { AdFreeShortcut } from "./AdFreeShortcut";
import { Spacing } from "../../theme/tokens";

const SETTINGS = require("../../../assets/ui/icons/settings.webp");
const BUTTON = 48;

type Props = {
  onSettings: () => void;
  onAddCoins: () => void;
  onAdFree: () => void;
};

export function TopBar({ onSettings, onAddCoins, onAdFree }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.actions}>
        <Pressable
          onPress={onSettings}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Image
            source={SETTINGS}
            style={styles.settings}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Pressable>
        <AdFreeShortcut onPress={onAdFree} />
      </View>

      <View style={styles.spacer} />

      <CoinPill onAddCoins={onAddCoins} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Settings hard left, coins hard right — nothing competes with the title
  // artwork for the middle.
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  spacer: { flex: 1, minWidth: 8 },
  settings: { width: BUTTON, height: BUTTON },
  pressed: { transform: [{ scale: 0.92 }] },
});
