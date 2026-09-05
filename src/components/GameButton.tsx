/**
 * The app's standard button. Chunky and tactile to match the vehicles, with a
 * visible press state — scale-down rather than a colour flash, which reads as
 * physical (DESIGN.md).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: ViewStyle;
};

export function GameButton({
  label,
  onPress,
  variant = 'secondary',
  disabled,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    // 44pt minimum touch target (DESIGN.md).
    minHeight: 52,
  },
  primary: { backgroundColor: Colors.coin },
  secondary: { backgroundColor: Colors.boardBackground },
  pressed: { transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.4 },
  label: { fontSize: 17, fontWeight: '700' },
  primaryLabel: { color: '#2C353F' },
  secondaryLabel: { color: Colors.textPrimary },
});
