import { BackButton } from "../components/navigation/BackButton";
/**
 * Level select.
 *
 * Laid out over `assets/ui/bg/levels_bg.webp`, which carries the scene AND the
 * painted "Levels" sign — so this screen renders no title of its own.
 *
 * A level is unlocked when it is the first, or the one before it is complete.
 * Locked tiles stay visible rather than hidden so progress is legible.
 */

import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CoinPill } from "../components/CoinPill";
import { levelSelectLayout } from "../game/rendering/screenLayout";
import { usePlayerStore } from "../state/playerStore";
import { CoinInfo } from "../components/CoinInfo";
import { useLevelCatalogStore } from "../state/levelCatalogStore";
import { visibleLevels } from "../game/levels/progression";
import type { RootStackParamList } from "../navigation/types";
import { Home, Radius, Spacing } from "../theme/tokens";

const BG = require("../../assets/ui/bg/levels_bg.webp");
const TILE_OPEN = require("../../assets/ui/buttons/playable_level.webp");
const TILE_LOCKED = require("../../assets/ui/buttons/disabled_level.webp");

const COLUMNS = 4;

type Props = NativeStackScreenProps<RootStackParamList, "LevelSelect">;

export function LevelSelectScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const allLevels = useLevelCatalogStore((s) => s.levels);
  const completed = usePlayerStore((s) => s.completedLevels);
  const levels = useMemo(
    () => visibleLevels(allLevels, completed),
    [allLevels, completed]
  );
  const coins = usePlayerStore((s) => s.coins);
  const devToggleUnlockAll = usePlayerStore((s) => s.devToggleUnlockAll);
  const [coinInfo, setCoinInfo] = useState(false);

  const { background, gridTop } = levelSelectLayout(width, height, insets.top);

  // Tighter margins than the default so the tiles themselves get bigger —
  // the art needs room for a number AND its arrow/padlock without them
  // crowding each other.
  const gap = 6;
  const sidePadding = Spacing.sm;
  const tileSize = (width - sidePadding * 2 - gap * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={styles.root}>
      <Image
        source={BG}
        style={[styles.bg, background]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <BackButton
        onPress={() => navigation.goBack()}
        style={[styles.back, { top: insets.top + Spacing.sm }]}
      />

      <View style={[styles.coins, { top: insets.top + Spacing.sm }]}>
        <CoinPill scale={0.8} onAddCoins={() => setCoinInfo(true)} />
      </View>

      {/* Testing shortcut. __DEV__ is false in release builds, so this is
          stripped entirely and can never reach a player. */}
      {__DEV__ ? (
        <Pressable
          onPress={() => devToggleUnlockAll(allLevels.map((l) => l.id))}
          accessibilityRole="button"
          accessibilityLabel="Developer: toggle unlock all levels"
          style={({ pressed }) => [
            styles.dev,
            { top: insets.top + Spacing.sm + 52 },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.devText}>
            {completed.length >= levels.length
              ? "DEV: lock"
              : "DEV: unlock all"}
          </Text>
        </Pressable>
      ) : null}

      <FlatList
        style={[styles.viewport, { marginTop: gridTop }]}
        data={levels}
        numColumns={COLUMNS}
        keyExtractor={(item) => String(item.id)}
        initialNumToRender={16}
        maxToRenderPerBatch={12}
        windowSize={5}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={[
          styles.grid,
          {
            paddingBottom: insets.bottom + Spacing.xl,
            paddingHorizontal: sidePadding,
            gap,
          },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: level, index }) => {
          const isDone = completed.includes(level.id);
          const previous = levels[index - 1];
          const unlocked = index === 0 || completed.includes(previous.id);

          return (
            <Pressable
              key={level.id}
              disabled={!unlocked}
              onPress={() => navigation.navigate("Game", { levelId: level.id })}
              accessibilityRole="button"
              accessibilityLabel={
                unlocked
                  ? `Level ${level.id}${isDone ? ", completed" : ""}`
                  : `Level ${level.id}, locked`
              }
              style={({ pressed }) => [
                { width: tileSize, height: tileSize },
                pressed && styles.tilePressed,
              ]}
            >
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
                ]}
              >
                {level.id}
              </Text>
              {isDone ? <Text style={styles.done}>✓</Text> : null}
            </Pressable>
          );
        }}
      />

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
  bg: { position: "absolute", top: 0, left: 0 },

  back: { position: "absolute", left: Spacing.md, zIndex: 3 },
  pressed: { transform: [{ scale: 0.94 }] },

  coins: { position: "absolute", right: Spacing.md, zIndex: 3 },
  dev: {
    position: "absolute",
    left: Spacing.md,
    zIndex: 4,
    backgroundColor: "rgba(230, 60, 60, 0.92)",
    borderRadius: Radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  devText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },

  viewport: { flex: 1 },
  grid: {},
  tilePressed: { transform: [{ scale: 0.95 }] },
  number: {
    position: "absolute",
    // Clear of the top edge, but still above the artwork's arrow/padlock zone
    // which starts around 45%.
    top: "13%",
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  numberLocked: { color: "#A8B4C8" },
  done: {
    position: "absolute",
    top: 4,
    right: 6,
    color: "#5BD94A",
    fontSize: 15,
    fontWeight: "900",
  },

  hintWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  hint: {
    backgroundColor: "rgba(28, 36, 52, 0.88)",
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  hintText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
