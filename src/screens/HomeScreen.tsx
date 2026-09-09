/**
 * Home.
 *
 * Laid out against `assets/ui/bg/home.webp`, which already contains the logo,
 * tagline, skyline and vehicles — so this screen draws NO title text. Adding
 * one would double up on artwork that is baked into the image.
 *
 * The art is 2:3 and phones are nearer 1:2.2, so it is fitted to WIDTH and
 * anchored to the top, with the road colour continuing beneath. Using `cover`
 * instead would crop ~23% off each side and clip the logo, which spans 15%-86%
 * of the image width.
 */

import React, { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeTile } from '../components/home/HomeTile';
import { PlayButton } from '../components/home/PlayButton';
import { ProgressBanner } from '../components/home/ProgressBanner';
import { TopBar } from '../components/home/TopBar';
import { CoinInfo } from '../components/CoinInfo';
import { usePlayerStore } from '../state/playerStore';
import { getLevel, TOTAL_LEVELS } from '../game/levels';
import type { RootStackParamList } from '../navigation/types';
import { Home, Spacing } from '../theme/tokens';

const BG = require('../../assets/ui/bg/home.webp');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const currentLevel = usePlayerStore(s => s.currentLevel);
  const completed = usePlayerStore(s => s.completedLevels);
  const coins = usePlayerStore(s => s.coins);
  const [coinInfo, setCoinInfo] = useState(false);

  // Fall back to level 1 once the player runs past the authored levels.
  const playLevel = getLevel(currentLevel) ? currentLevel : 1;
  const resuming = completed.length > 0 && getLevel(currentLevel) !== undefined;

  const play = useCallback(
    () => navigation.navigate('Game', { levelId: playLevel }),
    [navigation, playLevel],
  );

  return (
    <View style={styles.root}>
      {/* Full-bleed. The art is 9:21, taller than any common phone, so `cover`
          only ever trims sky at the top and road at the bottom — both are flat
          bands with nothing in them. It never crops horizontally, which is what
          would clip the logo.

          The size MUST be explicit. With only `position: absolute` and inset-0,
          an Image has no definite box to cover and falls back to drawing at its
          intrinsic size treated as dp — which on a 2.75-density screen renders
          the art at ~2.7x and shows only its top-left corner. */}
      <Image
        source={BG}
        style={[styles.bg, { width, height }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}>
        <TopBar
          onSettings={() => navigation.navigate('Settings')}
          onAddCoins={() => setCoinInfo(true)}
        />

        {/* Pushes the controls down over the road, clear of the vehicles. */}
        <View style={styles.spacer} />

        <View style={styles.controls}>
          <PlayButton levelId={playLevel} resuming={resuming} onPress={play} />

          <View style={styles.tiles}>
            <HomeTile
              icon="🗺️"
              label="LEVELS"
              color={Home.tileBlue}
              onPress={() => navigation.navigate('LevelSelect')}
            />
            <HomeTile
              icon="📅"
              label="DAILY"
              color={Home.tilePurple}
              locked
            />
            <HomeTile
              icon="🏆"
              label="AWARDS"
              color={Home.tileAmber}
              locked
            />
            <HomeTile
              icon="🛒"
              label="SHOP"
              color={Home.tilePink}
              locked
            />
          </View>

          <ProgressBanner completed={completed.length} total={TOTAL_LEVELS} />
        </View>
      </ScrollView>

      <CoinInfo
        visible={coinInfo}
        balance={coins}
        onDismiss={() => setCoinInfo(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The road colour continues below where the artwork ends, so the seam at the
  // bottom of the image is invisible.
  root: { flex: 1, backgroundColor: Home.road },
  // `stretch` at the art's exact ratio is a no-op distortion-wise, and unlike
  // `cover` it cannot decide to crop.
  bg: { position: 'absolute', top: 0, left: 0 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.md },
  spacer: { flex: 1, minHeight: Spacing.xl },
  controls: { gap: Spacing.md },
  tiles: { flexDirection: 'row', gap: Spacing.sm },
});
