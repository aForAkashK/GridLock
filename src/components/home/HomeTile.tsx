/**
 * One of the four category tiles under PLAY.
 *
 * Tiles for features that do not exist yet are rendered `locked`: dimmed,
 * labelled SOON, and genuinely inert. That is the `disabled` case from
 * GameScreen, not the `affordable` one — the feature is not unavailable
 * because of a balance, it simply has not been built, and a tile that silently
 * does nothing would read as a broken UI (DESIGN.md).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Home, Radius, Spacing } from '../../theme/tokens';

type Props = {
  icon: string;
  label: string;
  color: string;
  onPress?: () => void;
  /** Not built yet. Shows a SOON ribbon and does not respond to taps. */
  locked?: boolean;
  /** Small red dot for unseen content. */
  badge?: boolean;
};

export function HomeTile({
  icon,
  label,
  color,
  onPress,
  locked = false,
  badge = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}, coming soon` : label}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: color },
        locked && styles.locked,
        pressed && styles.pressed,
      ]}>
      {/* Top highlight — the same "lit from above" cue the vehicles use. */}
      <View style={styles.highlight} pointerEvents="none" />

      <Text style={styles.icon}>{icon}</Text>
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
    aspectRatio: 1.05,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: Spacing.xs,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  locked: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.96 }] },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: Home.tileHighlight,
  },
  icon: { fontSize: 21 },
  label: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  soon: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
    opacity: 0.85,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Home.badge,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
});
