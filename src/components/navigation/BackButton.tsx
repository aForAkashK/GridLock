import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { navigationAssets } from "./navigationAssets";

type Props = { onPress: () => void; style?: StyleProp<ViewStyle> };
/** Matches Home's settings icon; callers supply positioning, never new chrome. */
export function BackButton({ onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back"
      accessibilityHint="Return to the previous screen"
    >
      <Image
        source={navigationAssets.back}
        style={styles.art}
        resizeMode="contain"
        accessible={false}
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  art: { width: 48, height: 48 },
  pressed: { transform: [{ scale: 0.92 }] },
});
