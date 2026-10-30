import React, { useCallback, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { BackButton } from "../components/navigation/BackButton";
import { CoinPill } from "../components/CoinPill";
import { ScreenBackground } from "../components/home/ScreenBackground";
import { PurchasePopup } from "../components/shop/PurchasePopup";
import { usePlayerStore } from "../state/playerStore";
import { ads, useAdStore } from "../services/ads/adService";
import { TEST_ADS } from "../services/ads/sdkAdapter";
import {
  adStatus,
  COIN_AD_LADDER,
  COIN_PASSES,
  DAY_PASS_ADS,
  NORMAL_AD_COINS,
  type PassId,
} from "../services/ads/policy";
import { buyAdFreePass } from "../services/ads/rewardService";
import { historyId } from "../services/coins/history";
import { GameTypography } from "../theme/typography";
import { play } from "../services/audio/audioService";
export function AdBenefitsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "AdBenefits">) {
  const insets = useSafeAreaInsets(),
    state = usePlayerStore((s) => s.monetization),
    coins = usePlayerStore((s) => s.coins);
  const premium = usePlayerStore((s) => s.premium);
  const ad = useAdStore();
  const [now, setNow] = useState(Date.now()),
    [message, setMessage] = useState(""),
    [purchase, setPurchase] = useState<PassId | null>(null),
    [error, setError] = useState("");
  const receipt = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      usePlayerStore.getState().hydrateFromStorage();
      ads.start();
      setNow(Date.now());
      const timer = setInterval(() => setNow(Date.now()), 30000);
      const listener = AppState.addEventListener("change", (current) => {
        if (current === "active") {
          setNow(Date.now());
          usePlayerStore.getState().hydrateFromStorage();
          ads.start();
        }
      });
      return () => {
        clearInterval(timer);
        listener.remove();
      };
    }, [])
  );
  const status = adStatus(state, now),
    active = premium || status.active;
  const passCompleted =
    active && state.passViewsTotal >= DAY_PASS_ADS && status.passProgress === 0;
  const passProgress = passCompleted ? DAY_PASS_ADS : status.passProgress;
  const selectedPass = COIN_PASSES.find((p) => p.id === purchase);
  const openPass = (id: PassId) => {
    receipt.current = historyId("pass");
    setPurchase(id);
    setError("");
  };
  const confirm = () => {
    const token = receipt.current;
    if (!purchase || !token) return;
    receipt.current = null;
    try {
      const result = buyAdFreePass(purchase, token);
      usePlayerStore.getState().hydrateFromStorage();
      setNow(Date.now());
      if (result === "purchased" || result === "already_processed") {
        setPurchase(null);
        setMessage("Ad-free pass saved. Enjoy uninterrupted levels!");
        ads.warm();
        play("coin");
      } else {
        receipt.current = token;
        setError(
          result === "insufficient"
            ? "Not enough coins. Earn more from levels, Daily, Awards or rewarded ads."
            : result === "clock_changed"
            ? "Check your device date and time before buying a pass."
            : "Finish restoring your account before purchasing."
        );
      }
    } catch {
      receipt.current = token;
      setError(
        "Saving was interrupted. Retry safely; the same purchase will not be charged twice."
      );
    }
  };
  const watch = (purpose: "coins" | "day_pass") => {
    setMessage("");
    setNow(Date.now());
    ads.showRewarded(
      purpose,
      purpose === "coins" ? status.coinReward : undefined
    );
  };
  const button = (
    label: string,
    onPress: () => void,
    disabled = false,
    blue = false,
    completed = false
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        blue && styles.blue,
        disabled && !completed && styles.disabled,
        completed && styles.completedButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
  return (
    <ScreenBackground scrim={0.75}>
      <ScrollView
        style={{ marginTop: insets.top }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <CoinPill />
        </View>
        <Text style={styles.title}>Coins & Ad-Free</Text>
        {TEST_ADS ? (
          <Text style={styles.test}>TEST ADS · no live ad revenue</Text>
        ) : null}
        <View style={styles.statusCard}>
          <Text style={styles.heading}>
            {active ? "Ad-free is active" : "Keep the escape going"}
          </Text>
          <Text style={styles.body}>
            {premium
              ? "Your ad-free entitlement is active."
              : status.active
              ? `No forced level ads until ${new Date(
                  state.adFreeUntil
                ).toLocaleString()}.`
              : "Choose coins or build a 24-hour ad-free pass by watching optional ads."}
          </Text>
          <Text style={styles.note}>
            Ad-free removes automatic level ads. Optional rewarded ads remain
            available.
          </Text>
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message || ad.message}
        </Text>
        {status.clockChanged ? (
          <Text style={styles.message}>
            Your device clock moved backwards. Check date/time to collect new ad
            rewards or buy passes.
          </Text>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.heading}>Watch & earn coins</Text>
          <Text style={styles.body}>
            Next completed ad: +{status.coinReward} coins
          </Text>
          <View style={styles.ladder}>
            {COIN_AD_LADDER.map((amount, index) => (
              <View
                key={index}
                style={[
                  styles.step,
                  index === status.coinViews && styles.current,
                  index < status.coinViews && styles.completedStep,
                ]}
              >
                <Text style={styles.stepDay}>Ad {index + 1}</Text>
                <Text style={styles.stepAmount}>{amount}</Text>
                <Text style={styles.stepStatus}>
                  {index < status.coinViews
                    ? "Completed"
                    : index === status.coinViews
                    ? "Next"
                    : "Upcoming"}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>
            After ad 6: {NORMAL_AD_COINS} coins each, with no daily claim limit.
            The bonus ladder resets at local midnight.
          </Text>
          {button(
            `Watch ad · +${status.coinReward} coins`,
            () => watch("coins"),
            !ad.rewardedReady || ad.showing || status.clockChanged
          )}
          <Text style={styles.note}>
            Finish watching the ad to collect your coins. Closing early gives no
            reward.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>24 hours without level ads</Text>
          <Text style={styles.body}>
            {passCompleted
              ? `Completed · ${DAY_PASS_ADS}/${DAY_PASS_ADS} ads`
              : `Next 24-hour pass · ${status.passProgress}/${DAY_PASS_ADS} saved`}
          </Text>
          <View style={styles.progress}>
            <View
              style={[
                styles.progressFill,
                { width: `${(passProgress / DAY_PASS_ADS) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.note}>
            {active
              ? premium
                ? "Ad-free is already active. You do not need to watch pass ads."
                : `${
                    passCompleted
                      ? "Your 24-hour pass is complete! "
                      : "Ad-free is already active. "
                  }Come back after ${new Date(
                    state.adFreeUntil
                  ).toLocaleString()} to earn another pass.`
              : "These views earn pass progress only, not coins or coin-ladder progress. The 24-hour timer starts after the fifth completed ad. Partial progress is kept."}
          </Text>
          {button(
            active
              ? passCompleted
                ? "Completed · Ad-free is active"
                : "Ad-free is active"
              : `Watch pass ad · ${status.passProgress}/${DAY_PASS_ADS}`,
            () => watch("day_pass"),
            !ad.rewardedReady || ad.showing || active || status.clockChanged,
            true,
            active
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>Use earned coins</Text>
          <Text style={styles.note}>
            A new pass extends your current expiry. This is a coin purchase, not
            a real-money subscription.
          </Text>
          {COIN_PASSES.map((pass) => (
            <View key={pass.id} style={styles.passRow}>
              <Text style={styles.passLabel}>{pass.days} days ad-free</Text>
              {button(
                `${pass.price.toLocaleString()} coins`,
                () => openPass(pass.id),
                ad.showing || status.clockChanged || premium
              )}
            </View>
          ))}
        </View>
        {!ad.rewardedReady && !ad.showing
          ? button(
              "Load / retry ads",
              () => {
                ads.start();
                ads.warm();
              },
              false,
              true
            )
          : null}
        <Text style={styles.note}>
          Automatic level ads appear only at the results transition. If no ad is
          ready, you continue immediately. No ads interrupt a puzzle.
        </Text>
      </ScrollView>
      <PurchasePopup
        visible={!!selectedPass}
        title={selectedPass ? `${selectedPass.days}-day pass` : "Ad-free pass"}
        price={selectedPass?.price ?? 0}
        balance={coins}
        source={require("../../assets/ui/buttons/home_shop.webp")}
        description={`Removes forced level ads for ${
          selectedPass?.days ?? 0
        } days. Optional rewarded ads remain available. Extends an existing pass.`}
        error={error}
        onClose={() => {
          receipt.current = null;
          setPurchase(null);
        }}
        onBuy={confirm}
      />
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingHorizontal: 16,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 8,
  },
  title: {
    fontFamily: GameTypography.display,
    fontSize: 29,
    color: "#fff",
    textAlign: "center",
    marginTop: 8,
  },
  test: {
    color: "#ffe475",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  card: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: "#497db6",
    backgroundColor: "#203956",
    gap: 12,
  },
  statusCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#e4be49",
    backgroundColor: "#1a3555",
    gap: 8,
  },
  heading: { color: "#fff", fontFamily: GameTypography.display, fontSize: 21 },
  body: { color: "#e1edff", fontSize: 14, lineHeight: 21 },
  note: { color: "#c1d3ea", fontSize: 12, lineHeight: 18 },
  message: {
    color: "#ffe885",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  ladder: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  step: {
    minWidth: 80,
    flexBasis: "30%",
    flexGrow: 1,
    backgroundColor: "#102740",
    borderRadius: 10,
    padding: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#44648b",
  },
  completedStep: { borderColor: "#71df9a", backgroundColor: "#165342" },
  stepStatus: { color: "#e1edff", fontSize: 9, marginTop: 4 },
  completedButton: { backgroundColor: "#78dfa4", borderColor: "#34865b" },
  current: { borderColor: "#ffe135", backgroundColor: "#345176" },
  stepDay: { color: "#c3d7ef", fontSize: 10 },
  stepAmount: {
    color: "#ffe135",
    fontFamily: GameTypography.display,
    fontSize: 19,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffdf35",
    borderRadius: 14,
    borderColor: "#cf9412",
    borderBottomWidth: 4,
  },
  blue: { backgroundColor: "#86cafa", borderColor: "#3882bc" },
  disabled: { opacity: 0.55 },
  buttonText: {
    color: "#152b46",
    fontFamily: GameTypography.display,
    fontSize: 16,
    textAlign: "center",
  },
  pressed: { transform: [{ scale: 0.97 }] },
  progress: {
    height: 12,
    borderRadius: 8,
    backgroundColor: "#102740",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#66df68" },
  passRow: { gap: 8, paddingVertical: 6 },
  passLabel: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
