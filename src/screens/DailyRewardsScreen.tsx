import { BackButton } from "../components/navigation/BackButton";
import { DailyColours as Ink, DailyTypography as Type } from "../theme/daily";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import {
  GlossyRewardBoard,
  type RewardGeometry,
} from "../components/daily/GlossyRewardBoard";

import { CoinPill } from "../components/CoinPill";

import { useDailyRewardStatus } from "../hooks/useDailyRewardStatus";
import { usePlayerStore } from "../state/playerStore";
import { DAILY_REWARDS } from "../services/coins/economy";
import { play } from "../services/audio/audioService";

type Props = NativeStackScreenProps<RootStackParamList, "DailyRewards">;
export function DailyRewardsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [geometry, setGeometry] = useState<RewardGeometry>({});
  const measure = useCallback((key: string, event: LayoutChangeEvent) => {
    const rect = { ...event.nativeEvent.layout };
    setGeometry((previous) => {
      const old = previous[key];
      return old &&
        old.x === rect.x &&
        old.y === rect.y &&
        old.width === rect.width &&
        old.height === rect.height
        ? previous
        : { ...previous, [key]: rect };
    });
  }, []);
  const status = useDailyRewardStatus();
  const claimDaily = usePlayerStore((state) => state.claimDaily);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setMessage("");
  }, [status.day]);
  const claim = () => {
    try {
      const result = claimDaily();
      if (result.claimed) {
        play("coin");
        setMessage(`Collected ${result.amount} coins!`);
      } else {
        setMessage(
          result.reason === "clock_changed"
            ? "Check your device date and time, then try again."
            : result.reason === "recovery_pending"
            ? "Finish restoring your account before collecting."
            : "Already collected today. Come back tomorrow!"
        );
      }
    } catch {
      setMessage(
        "Could not finish saving. Try again; your claim will not be counted twice."
      );
    }
  };
  const currentDay = Math.min(status.streak, DAILY_REWARDS.length);
  const headerWidth = Math.min(width - 44, 440);
  const rewardTile = (amount: number, index: number) => {
    const day = index + 1;
    const collected =
      day < currentDay || (day === currentDay && status.claimed);
    return (
      <View
        key={day}
        onLayout={(event) => measure(`tile${day}`, event)}
        accessible
        accessibilityLabel={`Day ${day}${
          day === 7 ? " and onward" : ""
        }, ${amount} coins${
          collected
            ? ", collected"
            : day === currentDay
            ? ", current reward"
            : ""
        }`}
        style={styles.day}
      >
        <Text style={styles.dayLabel}>
          Day {day}
          {day === 7 ? "+" : ""}
        </Text>
        <Text style={styles.dayAmount}>{amount}</Text>
        <Text style={styles.dayCoins}>COINS</Text>
      </View>
    );
  };
  return (
    <View style={styles.root}>
      <Image
        source={require("../../assets/ui/bg/city_bg.webp")}
        style={[styles.background, { width, height }]}
        resizeMode="cover"
        accessible={false}
      />
      <View pointerEvents="none" style={styles.scrim} />
      <ScrollView
        style={{ marginTop: insets.top }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <CoinPill />
        </View>
        <Image
          source={require("../../assets/ui/daily/header.webp")}
          style={{ width: headerWidth, height: headerWidth / 2 }}
          resizeMode="contain"
          accessible
          accessibilityLabel="Daily rewards"
        />
        <View style={styles.subtitlePlate}>
          <Text style={styles.subtitle}>
            Collect every day to grow your streak.
          </Text>
        </View>
        <View
          style={styles.panel}
          onLayout={(event) => measure("panel", event)}
        >
          <GlossyRewardBoard
            geometry={geometry}
            currentDay={currentDay}
            claimed={status.claimed}
            available={status.available}
          />
          <Text style={styles.streak}>
            Day {status.streak}
            {status.claimed ? " complete" : ""}
          </Text>
          <View
            style={styles.coinStack}
            accessible={false}
            pointerEvents="none"
          >
            <View style={styles.coinGlow} />
            <Image source={COIN} style={styles.coinLeft} />
            <Image source={COIN} style={styles.coinRight} />
            <Image source={COIN} style={styles.coinFront} />
          </View>
          <Text style={styles.amount} adjustsFontSizeToFit numberOfLines={1}>
            +{status.amount} Coins
          </Text>
          <Text style={styles.body}>
            {status.clockChanged
              ? "Check your device date and time to continue."
              : status.claimed
              ? "Today’s reward is collected.\nTomorrow is another gift."
              : "Your daily gift is ready.\nCollect it and keep your streak going!"}
          </Text>
          <View
            style={styles.days}
            onLayout={(event) => measure("days", event)}
          >
            <View
              style={styles.dayRow}
              onLayout={(event) => measure("row1", event)}
            >
              {DAILY_REWARDS.slice(0, 4).map(rewardTile)}
            </View>
            <View
              style={[styles.dayRow, styles.lowerRow]}
              onLayout={(event) => measure("row2", event)}
            >
              {DAILY_REWARDS.slice(4).map((amount, index) =>
                rewardTile(amount, index + 4)
              )}
            </View>
          </View>
          <Pressable
            onLayout={(event) => measure("button", event)}
            onPress={claim}
            disabled={!status.available}
            accessibilityRole="button"
            accessibilityLabel={
              status.available
                ? `Collect ${status.amount} coins`
                : status.clockChanged
                ? "Reward paused"
                : "Collected today"
            }
            accessibilityState={{ disabled: !status.available }}
            style={({ pressed }) => [
              styles.claimButton,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.claimText,
                !status.available && styles.claimedText,
              ]}
            >
              {status.available
                ? `Collect ${status.amount} coins`
                : status.clockChanged
                ? "Reward paused"
                : "Collected today"}
            </Text>
          </Pressable>
          {message ? (
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {message}
            </Text>
          ) : null}
        </View>
        <Text style={styles.note}>
          A new reward unlocks at midnight on your device.{"\n"}Miss a day and
          your streak resets. Day 7+ pays 100.
        </Text>
      </ScrollView>
    </View>
  );
}
const COIN = require("../../assets/ui/icons/coin.webp");
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Ink.sceneFallback },
  background: { position: "absolute", top: 0, left: 0 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Ink.sceneScrim,
  },
  content: {
    paddingTop: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 6,
  },
  header: {
    width: "100%",
    maxWidth: 500,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingBottom: 2,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  subtitlePlate: {
    backgroundColor: Ink.subtitleFace,
    borderColor: Ink.subtitleEdge,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: -7,
    maxWidth: 460,
  },
  subtitle: {
    color: Ink.subtitleText,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: Ink.subtitleTextDepth,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  panel: {
    width: "100%",
    maxWidth: 500,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 22,
    borderRadius: 28,
    backgroundColor: Ink.panelFallback,
    gap: 6,
    overflow: "hidden",
  },
  streak: {
    color: Ink.white,
    fontSize: 21,
    fontFamily: Type.display,
    fontWeight: "normal",
    textAlign: "center",
    textShadowColor: Ink.titleDepth,
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },
  coinStack: {
    width: 104,
    height: 54,
    alignSelf: "center",
    marginTop: 0,
    marginBottom: -8,
  },
  coinGlow: {
    position: "absolute",
    top: 0,
    left: 16,
    width: 76,
    height: 52,
    borderRadius: 40,
    backgroundColor: Ink.coinGlow,
  },
  coinLeft: {
    position: "absolute",
    left: 8,
    bottom: 0,
    width: 44,
    height: 44,
    transform: [{ rotate: "-20deg" }],
  },
  coinRight: {
    position: "absolute",
    right: 8,
    bottom: 0,
    width: 44,
    height: 44,
    transform: [{ rotate: "20deg" }],
  },
  coinFront: { position: "absolute", left: 28, top: 0, width: 50, height: 50 },
  amount: {
    color: Ink.amount,
    fontSize: 36,
    fontFamily: Type.display,
    fontWeight: "normal",
    textAlign: "center",
    textShadowColor: Ink.titleDepth,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  body: {
    color: Ink.body,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 3,
  },
  days: { gap: 8 },
  dayRow: { flexDirection: "row", gap: 6 },
  lowerRow: { paddingHorizontal: 18 },
  day: {
    flex: 1,
    minHeight: 93,
    paddingHorizontal: 2,
    paddingTop: 7,
    paddingBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: {
    color: Ink.white,
    fontSize: 12,
    fontFamily: Type.display,
    fontWeight: "normal",
    textShadowColor: Ink.dayTextDepth,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  dayAmount: {
    color: Ink.dayAmount,
    fontSize: 27,
    fontFamily: Type.display,
    fontWeight: "normal",
    textShadowColor: Ink.dayTextDepth,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  dayCoins: {
    color: Ink.dayCoins,
    fontSize: 10,
    fontFamily: Type.display,
    fontWeight: "normal",
  },
  claimButton: {
    minHeight: 55,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingBottom: 5,
    marginTop: 3,
  },
  claimText: {
    color: Ink.claimText,
    fontSize: 20,
    fontFamily: Type.display,
    fontWeight: "normal",
    textAlign: "center",
    textShadowColor: "transparent",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  claimedText: { color: Ink.claimedText },
  message: {
    color: Ink.message,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },
  note: {
    color: Ink.footer,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    maxWidth: 440,
    textShadowColor: Ink.footerDepth,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 4,
  },
});
