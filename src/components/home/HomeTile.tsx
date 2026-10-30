/**
 * One of the four category tiles under PLAY.
 *
 * Tiles for features that do not exist yet are rendered `locked`: dimmed,
 * labelled SOON, and genuinely inert. That is the `disabled` case from
 * GameScreen, not the `affordable` one — the feature is not unavailable
 * because of a balance, it simply has not been built, and a tile that silently
 * does nothing would read as a broken UI (DESIGN.md).
 */

import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Home } from "../../theme/tokens";
import { homeTileAssets, type HomeTileKind } from "./homeTileAssets";

type Props = {
  kind: HomeTileKind;
  label: string;
  accessibilityHint?: string;
  onPress?: () => void;
  /** Not built yet. Shows a SOON ribbon and does not respond to taps. */
  locked?: boolean;
  /** Small red dot for unseen content. */
  badge?: boolean;
};

export function HomeTile({
  kind,
  label,
  accessibilityHint,
  onPress,
  locked = false,
  badge = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityLabel={locked ? `${label}, coming soon` : label}
      accessibilityState={{ disabled: locked }}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Image
        source={homeTileAssets[kind]}
        style={[styles.art, locked && styles.locked]}
        resizeMode="contain"
        resizeMethod="resize"
        accessible={false}
        accessibilityIgnoresInvertColors
      />

      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>

      {locked ? <Text style={styles.soon}>SOON</Text> : null}
      {badge && !locked ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  art: { position: "absolute", width: "100%", height: "100%" },
  locked: { opacity: 0.65 },
  pressed: { transform: [{ scale: 0.96 }] },
  label: {
    color: "#FFFFFF",
    position: "absolute",
    top: "68%",
    width: "100%",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.3,
    textShadowColor: Home.chromeBorder,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  soon: {
    position: "absolute",
    top: "83%",
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.85,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Home.badge,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
});
