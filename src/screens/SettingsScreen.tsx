/**
 * Settings. Sound, music and haptics; each persists to MMKV on toggle.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenBackground } from '../components/home/ScreenBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettingsStore } from '../state/settingsStore';
import type { RootStackParamList } from '../navigation/types';
import { Home, Radius, Spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type ToggleKey = 'soundEnabled' | 'musicEnabled' | 'hapticsEnabled';

const ROWS: Array<{ key: ToggleKey; label: string }> = [
  { key: 'soundEnabled', label: 'Sound effects' },
  { key: 'musicEnabled', label: 'Music' },
  { key: 'hapticsEnabled', label: 'Haptics' },
];

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore();

  return (
    <ScreenBackground>
      <View style={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.list}>
        {ROWS.map(row => (
          <Pressable
            key={row.key}
            onPress={() => settings.toggle(row.key)}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings[row.key] }}
            style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>
              {settings[row.key] ? 'On' : 'Off'}
            </Text>
          </Pressable>
        ))}
      </View>

        <Text style={styles.note}>
          Audio is not wired yet — these persist for when it is (TASKS.md
          Phase 9).
        </Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  back: { color: '#FFFFFF', fontSize: 32, width: 40 },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  spacer: { width: 40 },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Home.chrome,
    borderWidth: 2,
    borderColor: Home.chromeBorder,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
  },
  rowLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  rowValue: { color: Home.coinGold, fontSize: 16, fontWeight: '800' },
  note: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    paddingHorizontal: Spacing.lg,
  },
});
