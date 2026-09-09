/**
 * Level select.
 *
 * A level is unlocked when it is the first, or the one before it is complete.
 * Locked tiles stay visible rather than hidden so progress is legible.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/home/ScreenBackground';
import { usePlayerStore } from '../state/playerStore';
import { LEVELS } from '../game/levels';
import type { RootStackParamList } from '../navigation/types';
import { Home, Radius, Spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

export function LevelSelectScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const completed = usePlayerStore(s => s.completedLevels);
  const coins = usePlayerStore(s => s.coins);

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>

        <Text style={styles.title}>Levels</Text>

        <View style={styles.coinPill}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        {LEVELS.map((level, index) => {
          const isDone = completed.includes(level.id);
          const previous = LEVELS[index - 1];
          const unlocked = index === 0 || completed.includes(previous.id);

          return (
            <Pressable
              key={level.id}
              disabled={!unlocked}
              onPress={() => navigation.navigate('Game', { levelId: level.id })}
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
              {unlocked ? (
                <View style={styles.tileHighlight} pointerEvents="none" />
              ) : null}
              <Text style={[styles.tileNumber, !unlocked && styles.lockedInk]}>
                {level.id}
              </Text>
              <Text style={[styles.tileMark, !unlocked && styles.lockedInk]}>
                {isDone ? '✓' : unlocked ? '▶' : '🔒'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  back: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Home.chrome,
    borderWidth: 2,
    borderColor: Home.chromeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },
  pressed: { transform: [{ scale: 0.94 }] },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Home.chrome,
    borderWidth: 2,
    borderColor: Home.chromeBorder,
    borderRadius: Radius.pill,
    paddingVertical: 7,
    paddingHorizontal: Spacing.sm,
    minWidth: 84,
    justifyContent: 'center',
  },
  coinIcon: { fontSize: 14 },
  coinText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'flex-start',
  },
  tile: {
    width: 74,
    height: 74,
    borderRadius: Radius.md,
    backgroundColor: Home.tileBlue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  tileHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: Home.tileHighlight,
  },
  tileDone: { backgroundColor: Home.playBottom },
  // Solid, not translucent. At reduced opacity the artwork read straight
  // through the tile, turning the grid into a window onto the logo rather than
  // a set of buttons. Dim the CONTENT instead of the container.
  tileLocked: { backgroundColor: 'rgba(28, 36, 52, 0.92)' },
  tilePressed: { transform: [{ scale: 0.95 }] },
  tileNumber: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  lockedInk: { opacity: 0.5 },
  tileMark: { color: '#FFFFFF', fontSize: 12, marginTop: 1, opacity: 0.9 },
});
