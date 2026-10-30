/** Shared, neutral entry to coin rewards and ad-free options. */
import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Canvas,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import { COIN_REWARDS } from "../services/coins/types";
import { GameTypography } from "../theme/typography";

const coin = require("../../assets/ui/icons/coin.webp");

type Props = {
  visible: boolean;
  balance: number;
  needed?: number;
  onDismiss: () => void;
  onAds?: () => void;
};

/** Static gradients, laid out once; text and touch targets remain native. */
function Gloss({
  gold = false,
  panel = false,
}: {
  gold?: boolean;
  panel?: boolean;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={({ nativeEvent: { layout } }) => {
        setSize((old) =>
          old.width === layout.width && old.height === layout.height
            ? old
            : { width: layout.width, height: layout.height }
        );
      }}
    >
      {size.width > 0 && size.height > 12 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <RoundedRect
            x={1}
            y={5}
            width={size.width - 2}
            height={size.height - 6}
            r={panel ? 30 : 22}
            color={gold ? "#723500" : "#03153e"}
          />
          <RoundedRect
            x={2}
            y={1}
            width={size.width - 4}
            height={size.height - 8}
            r={panel ? 29 : 21}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, size.height)}
              colors={
                gold
                  ? ["#fff17b", "#ffdc23", "#ffa900"]
                  : panel
                  ? ["#1b69c0", "#104784", "#092a5b"]
                  : ["#268df3", "#1160c6", "#094498"]
              }
            />
          </RoundedRect>
          <RoundedRect
            x={5}
            y={4}
            width={size.width - 10}
            height={size.height - 14}
            r={panel ? 26 : 18}
            style="stroke"
            strokeWidth={2}
            color={gold ? "#fff390" : "#51b8ff"}
          />
          <RoundedRect
            x={10}
            y={10}
            width={size.width - 20}
            height={size.height - 25}
            r={panel ? 23 : 15}
            style="stroke"
            strokeWidth={1}
            color={gold ? "#ffd34a" : "#2567ab"}
          />
        </Canvas>
      ) : null}
    </View>
  );
}

export function CoinInfo({
  visible,
  balance,
  needed,
  onDismiss,
  onAds,
}: Props) {
  if (!visible) {
    return null;
  }
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollBody}
          bounces={false}
        >
          <View style={styles.composition} accessibilityViewIsModal>
            <View style={styles.pile} pointerEvents="none" accessible={false}>
              <Image source={coin} style={[styles.pileCoin, styles.coinLeft]} />
              <Image
                source={coin}
                style={[styles.pileCoin, styles.coinRight]}
              />
              <Image
                source={coin}
                style={[styles.pileCoin, styles.coinFront]}
              />
              <Image source={coin} style={[styles.pileCoin, styles.coinHero]} />
            </View>
            <View style={styles.card}>
              <Gloss panel />
              <Text accessibilityRole="header" style={styles.title}>
                {needed !== undefined ? "Not enough coins" : "Your "}
                {needed === undefined ? (
                  <Text style={styles.goldText}>Coins</Text>
                ) : null}
              </Text>
              <View
                style={styles.balancePill}
                accessibilityLabel={`${balance} coins`}
                accessible
              >
                <Image source={coin} style={styles.balanceCoin} />
                <Text
                  style={styles.balance}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {balance.toLocaleString()}
                </Text>
              </View>
              {needed !== undefined ? (
                <Text style={styles.shortfall}>This costs {needed} coins.</Text>
              ) : null}
              <View style={styles.reward}>
                <Image
                  source={coin}
                  style={styles.rewardCoin}
                  accessible={false}
                />
                <Text style={styles.rewardText}>
                  Clear a level to earn{" "}
                  <Text style={styles.goldText}>
                    +{COIN_REWARDS.level_complete}
                  </Text>
                </Text>
              </View>
              <Text style={styles.note}>
                Collect Daily gifts and Awards bonuses, or explore more coin and
                ad-free options.
              </Text>
              {onAds ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onAds}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressed,
                  ]}
                >
                  <Gloss gold />
                  <Image
                    source={coin}
                    style={styles.buttonCoin}
                    accessible={false}
                  />
                  <Text style={styles.primaryLabel}>Coins & Ad-Free</Text>
                  <Text style={styles.arrow} accessible={false}>
                    ›
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                ]}
              >
                <Gloss />
                <Text style={styles.secondaryLabel}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#031124b8",
    justifyContent: "center",
    paddingHorizontal: 17,
    paddingVertical: 28,
  },
  scroll: { flexGrow: 0, maxHeight: "100%" },
  scrollBody: { alignItems: "center", paddingBottom: 8 },
  composition: { width: "100%", maxWidth: 440, paddingTop: 82 },
  card: { padding: 22, paddingTop: 29, paddingBottom: 23, gap: 14 },
  pile: {
    position: "absolute",
    top: 0,
    height: 110,
    width: 220,
    alignSelf: "center",
    zIndex: 1,
  },
  pileCoin: {
    position: "absolute",
    width: 85,
    height: 85,
    resizeMode: "contain",
  },
  coinLeft: { left: 13, top: 32, transform: [{ rotate: "-25deg" }] },
  coinRight: { right: 8, top: 29, transform: [{ rotate: "25deg" }] },
  coinFront: {
    left: 80,
    top: 50,
    width: 72,
    height: 72,
    transform: [{ rotate: "65deg" }],
  },
  coinHero: {
    left: 66,
    top: 0,
    width: 100,
    height: 100,
    transform: [{ rotate: "-8deg" }],
  },
  title: {
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 34,
    textAlign: "center",
    textShadowColor: "#04204c",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 1,
  },
  goldText: { color: "#ffdf32" },
  balancePill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 25,
    paddingLeft: 5,
    minWidth: 160,
    maxWidth: "100%",
    backgroundColor: "#072c63",
    borderRadius: 40,
    borderColor: "#2879ca",
    borderWidth: 2,
  },
  balanceCoin: { width: 52, height: 52 },
  balance: {
    flexShrink: 1,
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 33,
    paddingVertical: 3,
  },
  shortfall: { color: "#ffdf83", textAlign: "center", fontSize: 15 },
  reward: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 17,
    borderColor: "#2f75bd",
    borderWidth: 1.5,
    backgroundColor: "#082f67",
  },
  rewardCoin: { width: 39, height: 39 },
  rewardText: {
    flex: 1,
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 18,
    textAlign: "center",
  },
  note: {
    color: "#c7def5",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    marginVertical: 2,
  },
  button: {
    minHeight: 65,
    paddingHorizontal: 13,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  buttonCoin: { width: 35, height: 35 },
  primaryLabel: {
    flexShrink: 1,
    fontFamily: GameTypography.display,
    color: "#542b00",
    fontSize: 21,
    textAlign: "center",
  },
  secondaryLabel: {
    fontFamily: GameTypography.display,
    color: "#fff",
    fontSize: 23,
    textShadowColor: "#06285a",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  arrow: { color: "#8c4800", fontSize: 35, lineHeight: 36 },
  pressed: { transform: [{ scale: 0.97 }] },
});
