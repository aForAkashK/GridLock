import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GameTypography } from "../../theme/typography";
import { play } from "../../services/audio/audioService";

/** A native UI symbol: no extra image download or sprite decode. */
export function AdFreeShortcut({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ad-Free options"
      accessibilityHint="Open 24-hour and coin-funded ad-free passes"
      onPress={() => {
        play("tap");
        onPress();
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View
        style={styles.icon}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={styles.ad} allowFontScaling={false}>
          AD
        </Text>
        <View style={styles.slash} />
      </View>
      <Text style={styles.label} maxFontSizeMultiplier={1.1}>
        Ad-Free
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minWidth: 56,
    minHeight: 48,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 13,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: "#fff39a",
    borderBottomColor: "#ca7900",
    backgroundColor: "#ffdb26",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  icon: {
    width: 25,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#102e52",
    alignItems: "center",
    justifyContent: "center",
  },
  ad: {
    fontSize: 9,
    fontFamily: GameTypography.display,
    color: "#102e52",
    lineHeight: 12,
  },
  slash: {
    position: "absolute",
    width: 29,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#102e52",
    transform: [{ rotate: "-35deg" }],
  },
  label: { fontFamily: GameTypography.display, fontSize: 11, color: "#102e52" },
  pressed: { transform: [{ scale: 0.94 }] },
});
