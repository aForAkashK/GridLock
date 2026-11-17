import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CoinPill } from "../components/CoinPill";
import { ScreenBackground } from "../components/home/ScreenBackground";
import { BackButton } from "../components/navigation/BackButton";
import type { RootStackParamList } from "../navigation/types";
import {
  cancelCoinPackPrices,
  COIN_PACKS,
  hasBestValue,
  hasPlayCatalog,
  isPlayCheckoutConfigured,
  loadCoinPackPrices,
  type CoinPackId,
  type CoinPackPrices,
} from "../services/purchases/coinCatalog";
import {
  buyCoinPack,
  recoverCoinPurchases,
} from "../services/purchases/playCoinPurchases";
import { Spacing } from "../theme/tokens";
import { GameTypography } from "../theme/typography";

const CITY = require("../../assets/ui/bg/city_bg.webp");
const PACK_ART = {
  coins_300: require("../../assets/ui/coins/pack_300.webp"),
  coins_900: require("../../assets/ui/coins/pack_900.webp"),
  coins_1800: require("../../assets/ui/coins/pack_1800.webp"),
  coins_3300: require("../../assets/ui/coins/pack_3300.webp"),
} as const;

const GRID_GAP = Spacing.sm + 4;
const MAX_WIDTH = 500;

export function BuyCoinsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "BuyCoins">) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.min(
    MAX_WIDTH,
    width - insets.left - insets.right - Spacing.md * 2
  );
  const columns = contentWidth < 280 || fontScale >= 1.45 ? 1 : 2;
  const compact = columns === 2 && height < 710;
  const cardWidth =
    columns === 1 ? Math.min(contentWidth, 320) : (contentWidth - GRID_GAP) / 2;

  const [prices, setPrices] = useState<CoinPackPrices | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [buying, setBuying] = useState<CoinPackId | null>(null);
  const [message, setMessage] = useState("");
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused || !hasPlayCatalog) return;
    let active = true;
    setPrices(null);
    recoverCoinPurchases().then((result) => {
      if (active && result) setMessage(result);
    });
    loadCoinPackPrices().then(
      (result) => {
        if (active) setPrices(result);
      },
      () => {
        if (active) setPrices({});
      }
    );
    return () => {
      active = false;
      cancelCoinPackPrices();
    };
  }, [isFocused, attempt]);
  const incomplete =
    prices !== null && COIN_PACKS.some((pack) => !prices[pack.id]);
  const status = !hasPlayCatalog
    ? "India pricing preview · Checkout unavailable"
    : prices === null
    ? "Checking Google Play prices…"
    : incomplete
    ? "Some Google Play prices are unavailable"
    : isPlayCheckoutConfigured
    ? "Checkout with Google Play"
    : "Google Play prices · Checkout unavailable";

  async function purchase(id: CoinPackId) {
    if (buying) return;
    setBuying(id);
    setMessage("");
    try {
      setMessage(await buyCoinPack(id));
    } finally {
      setBuying(null);
    }
  }

  return (
    <ScreenBackground source={CITY} scrim={0.18}>
      <View
        style={[
          styles.safeArea,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <CoinPill />
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            compact && styles.compactBody,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
        >
          <Text accessibilityRole="header" style={styles.title}>
            Buy <Text style={styles.titleGold}>Coins</Text>
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.preview, { maxWidth: contentWidth }]}
          >
            {message || status}
          </Text>
          <View style={[styles.grid, { width: contentWidth }]}>
            {COIN_PACKS.map((pack) => {
              const best =
                pack.id === "coins_3300" &&
                (!hasPlayCatalog || hasBestValue(prices));
              const price = hasPlayCatalog
                ? prices?.[pack.id]?.formatted
                : pack.previewPrice;
              const priceLabel =
                price ?? (prices === null ? "Loading…" : "Unavailable");
              const priceStyle = [
                styles.price,
                !price && styles.priceUnavailable,
              ];
              const priceText = (
                <Text
                  style={[
                    styles.priceText,
                    !price && styles.priceUnavailableText,
                  ]}
                >
                  {buying === pack.id ? "Checking…" : priceLabel}
                </Text>
              );
              return (
                <View
                  key={pack.id}
                  style={[
                    styles.card,
                    compact && styles.compactCard,
                    { width: cardWidth },
                    best && styles.bestCard,
                  ]}
                >
                  {best ? (
                    <Text style={styles.bestTag} maxFontSizeMultiplier={1.3}>
                      Best value
                    </Text>
                  ) : null}
                  <Image
                    accessible={false}
                    accessibilityIgnoresInvertColors
                    source={PACK_ART[pack.id]}
                    resizeMode="contain"
                    fadeDuration={0}
                    style={[
                      styles.packArt,
                      {
                        height: Math.min(cardWidth * 0.82, compact ? 86 : 156),
                      },
                    ]}
                  />
                  <Text style={styles.amount}>
                    {pack.amount.toLocaleString()} Coins
                  </Text>
                  {isPlayCheckoutConfigured && price ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Buy ${pack.amount.toLocaleString()} coins for ${price}`}
                      accessibilityState={{
                        disabled: buying !== null,
                        busy: buying === pack.id,
                      }}
                      disabled={buying !== null}
                      onPress={() => purchase(pack.id)}
                      style={priceStyle}
                    >
                      {priceText}
                    </Pressable>
                  ) : (
                    <View style={priceStyle}>{priceText}</View>
                  )}
                </View>
              );
            })}
          </View>
          {hasPlayCatalog && incomplete ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setAttempt((value) => value + 1)}
              style={styles.preview}
            >
              <Text style={styles.retryText}>Retry Google Play</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    width: "100%",
    maxWidth: MAX_WIDTH + Spacing.md * 2,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  scrollBody: {
    alignItems: "center",
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  compactBody: { paddingTop: Spacing.sm, gap: Spacing.sm },
  title: {
    color: "#fff5dd",
    fontFamily: GameTypography.display,
    fontSize: 40,
    textAlign: "center",
    marginHorizontal: Spacing.md,
    textShadowColor: "#06316d",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 2,
  },
  titleGold: { color: "#ffd536" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#0b3b8e",
    borderRadius: 23,
    borderWidth: 3,
    borderColor: "#268eeb",
    borderTopColor: "#68ddff",
    borderBottomColor: "#082457",
    paddingHorizontal: Spacing.sm + 2,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  bestCard: { borderColor: "#ffd547", borderBottomColor: "#d98913" },
  compactCard: { paddingTop: 18, paddingBottom: Spacing.sm, gap: 6 },
  bestTag: {
    position: "absolute",
    zIndex: 1,
    right: Spacing.sm,
    top: Spacing.xs,
    borderRadius: 20,
    backgroundColor: "#ffd547",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    color: "#392403",
    fontFamily: GameTypography.display,
    fontSize: 11,
  },
  packArt: { width: "100%" },
  amount: {
    flexGrow: 1,
    color: "#fff5dd",
    fontFamily: GameTypography.display,
    fontSize: 19,
    textAlign: "center",
  },
  price: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#ffcf2e",
    borderTopColor: "#ffed94",
    borderBottomColor: "#d87b09",
    backgroundColor: "#ffc329",
  },
  priceText: {
    color: "#102346",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  priceUnavailable: { backgroundColor: "#082451", borderColor: "#266bad" },
  priceUnavailableText: { color: "#e4edf9", fontSize: 15 },
  retryText: {
    color: "#fff5dd",
    fontWeight: "700",
    textAlign: "center",
    minHeight: 28,
    textAlignVertical: "center",
  },
  preview: {
    borderRadius: 13,
    backgroundColor: "#082451",
    color: "#e4edf9",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 13,
    textAlign: "center",
  },
});
