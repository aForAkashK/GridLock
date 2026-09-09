/**
 * Level select.
 *
 * Laid out over `assets/ui/bg/levels_bg.webp`, which carries the scene AND the
 * painted "Levels" sign — so this screen renders no title of its own.
 *
 * A level is unlocked when it is the first, or the one before it is complete.
 * Locked tiles stay visible rather than hidden so progress is legible.
 */

import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CoinPill } from '../components/CoinPill';
import { usePlayerStore } from '../state/playerStore';
import { CoinInfo } from '../components/CoinInfo';
import { LEVELS } from '../game/levels';
import type { RootStackParamList } from '../navigation/types';
import { Home, Radius, Spacing } from '../theme/tokens';

const BG = require('../../assets/ui/bg/levels_bg.webp');
const TILE_OPEN = require('../../assets/ui/buttons/playable_level.webp');
const TILE_LOCKED = require('../../assets/ui/buttons/disabled_level.webp');

/**
 * Where the painted sign ends (measured: y 174..312 of 1863). The grid starts
 * below it so chrome never collides with artwork.
 */
const BG_H = 1863;
const SIGN_BOTTOM = 312 / BG_H;

const COLUMNS = 4;

/** Breathing room between the painted "Levels" sign and the first row. */
const GRID_TOP_GAP = 52;

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

export function LevelSelectScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const completed = usePlayerStore(s => s.completedLevels);
  const coins = usePlayerStore(s => s.coins);
  const [coinInfo, setCoinInfo] = useState(false);

  // Same cover maths as the other screens, so the grid tracks the painted sign
  // rather than guessing at a fixed offset.
  const scale = Math.max(width / 844, height / BG_H);
  const bgH = BG_H * scale;
  const bgY = (height - bgH) / 2;
  const gridTop = bgY + SIGN_BOTTOM * bgH + GRID_TOP_GAP;

  // Tighter margins than the default so the tiles themselves get bigger —
  // the art needs room for a number AND its arrow/padlock without them
  // crowding each other.
  const gap = 6;
  const sidePadding = Spacing.sm;
  const tileSize =
    (width - sidePadding * 2 - gap * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={styles.root}>
      <Image
        source={BG}
        style={[styles.bg, { width, height }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        style={({ pressed }) => [
          styles.back,
          { top: insets.top + Spacing.sm },
          pressed && styles.pressed,
        ]}>
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>

      <View style={[styles.coins, { top: insets.top + Spacing.sm }]}>
        <CoinPill onAddCoins={() => setCoinInfo(true)} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.grid,
          {
            paddingTop: gridTop,
            paddingBottom: insets.bottom + Spacing.xl,
            paddingHorizontal: sidePadding,
            gap,
          },
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
                unlocked
                  ? `Level ${level.id}${isDone ? ', completed' : ''}`
                  : `Level ${level.id}, locked`
              }
              style={({ pressed }) => [
                { width: tileSize, height: tileSize },
                pressed && styles.tilePressed,
              ]}>
              {/* Explicit size, NOT absoluteFill. An Image with only inset-0
                  has no definite box, so `contain` falls back to drawing at
                  intrinsic size treated as dp — a 1254px tile then renders
                  enormous. Same trap as the screen backgrounds. */}
              <Image
                source={unlocked ? TILE_OPEN : TILE_LOCKED}
                style={{ width: tileSize, height: tileSize }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              {/* The art keeps its lower half for the play arrow or padlock,
                  so the number sits in the clear upper half. */}
              <Text
                style={[
                  styles.number,
                  { fontSize: tileSize * 0.25 },
                  !unlocked && styles.numberLocked,
                ]}>
                {level.id}
              </Text>
              {isDone ? <Text style={styles.done}>✓</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* <View style={[styles.hint, { bottom: insets.bottom + Spacing.md }]}>
        <Text style={styles.hintText}>
          Solve more levels and unlock new challenges!
        </Text>
      </View> */}
      <CoinInfo
        visible={coinInfo}
        balance={coins}
        onDismiss={() => setCoinInfo(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Home.sky },
  bg: { position: 'absolute', top: 0, left: 0 },

  back: {
    position: 'absolute',
    left: Spacing.md,
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Home.chrome,
    borderWidth: 2,
    borderColor: Home.chromeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  backArrow: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },
  pressed: { transform: [{ scale: 0.94 }] },

  coins: { position: 'absolute', right: Spacing.md, zIndex: 3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tilePressed: { transform: [{ scale: 0.95 }] },
  number: {
    position: 'absolute',
    // Clear of the top edge, but still above the artwork's arrow/padlock zone
    // which starts around 45%.
    top: '13%',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  numberLocked: { color: '#A8B4C8' },
  done: {
    position: 'absolute',
    top: 4,
    right: 6,
    color: '#5BD94A',
    fontSize: 15,
    fontWeight: '900',
  },

  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  hint: {
    backgroundColor: 'rgba(28, 36, 52, 0.88)',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  hintText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
