/**
 * Level select.
 *
 * A level is unlocked when it is the first level, or the one before it has
 * been completed. Locked tiles stay visible rather than hidden so progress is
 * legible.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CoinCounter } from '../components/CoinCounter';
import { usePlayerStore } from '../state/playerStore';
import { LEVELS } from '../game/levels';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Radius, Spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

export function LevelSelectScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const completed = usePlayerStore(s => s.completedLevels);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Levels</Text>
        <CoinCounter compact />
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {LEVELS.map((level, index) => {
          const isDone = completed.includes(level.id);
          const previous = LEVELS[index - 1];
          const unlocked = index === 0 || completed.includes(previous.id);

          return (
            <Pressable
              key={level.id}
              disabled={!unlocked}
              onPress={() =>
                navigation.navigate('Game', { levelId: level.id })
              }
              accessibilityRole="button"
              accessibilityLabel={
                unlocked ? `Level ${level.id}` : `Level ${level.id}, locked`
              }
              style={({ pressed }) => [
                styles.tile,
                isDone && styles.tileDone,
                !unlocked && styles.tileLocked,
                pressed && styles.tilePressed,
              ]}>
              <Text style={styles.tileNumber}>{level.id}</Text>
              <Text style={styles.tileMark}>
                {isDone ? '✓' : unlocked ? '' : '🔒'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBackground },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  back: { color: Colors.textSecondary, fontSize: 32, width: 40 },
  title: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.boardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileDone: { backgroundColor: Colors.roadTile },
  tileLocked: { opacity: 0.35 },
  tilePressed: { transform: [{ scale: 0.96 }] },
  tileNumber: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  tileMark: { color: Colors.coin, fontSize: 13, marginTop: 2 },
});
