/**
 * Home.
 *
 * One obvious action. PLAY is the largest thing on screen and needs no
 * thought — everything else is secondary (DESIGN.md).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GameButton } from '../components/GameButton';
import { CoinCounter } from '../components/CoinCounter';
import { usePlayerStore } from '../state/playerStore';
import { getLevel, TOTAL_LEVELS } from '../game/levels';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const currentLevel = usePlayerStore(s => s.currentLevel);
  const completed = usePlayerStore(s => s.completedLevels);

  // Fall back to level 1 once the player has run out of authored levels.
  const playLevel = getLevel(currentLevel) ? currentLevel : 1;
  const resuming = completed.length > 0 && getLevel(currentLevel);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom },
      ]}>
      <View style={styles.coinRow}>
        <CoinCounter />
      </View>

      <View style={styles.centre}>
        <Text style={styles.title}>FREEWAY</Text>
        <Text style={styles.title}>ESCAPE</Text>
        <Text style={styles.tagline}>Swipe. Clear. Escape.</Text>

        <GameButton
          label={resuming ? `Continue · Level ${playLevel}` : 'PLAY'}
          variant="primary"
          onPress={() => navigation.navigate('Game', { levelId: playLevel })}
          style={styles.play}
        />

        <GameButton
          label="Levels"
          onPress={() => navigation.navigate('LevelSelect')}
          style={styles.secondary}
        />
        <GameButton
          label="Settings"
          onPress={() => navigation.navigate('Settings')}
          style={styles.secondary}
        />
      </View>

      <Text style={styles.progress}>
        {completed.length} / {TOTAL_LEVELS} levels cleared
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
    paddingHorizontal: Spacing.lg,
  },
  coinRow: { alignItems: 'flex-end' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    color: Colors.textPrimary,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 48,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  play: { alignSelf: 'stretch', marginTop: Spacing.lg },
  secondary: { alignSelf: 'stretch', marginTop: Spacing.sm },
  progress: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
