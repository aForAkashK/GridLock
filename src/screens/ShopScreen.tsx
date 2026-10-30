import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { BackButton } from "../components/navigation/BackButton";
import { PurchasePopup } from "../components/shop/PurchasePopup";
import { CoinPill } from "../components/CoinPill";
import { ShopGridBackdrop } from "../components/shop/ShopGridBackdrop";
import { inventoryGridLayout } from "../components/shop/gridLayout";
import { usePlayerStore } from "../state/playerStore";
import {
  SKINS,
  type SkinId,
  type SkinColour,
  type AppearanceSlot,
} from "../services/shop/policy";
import { skinAssets } from "../services/shop/assets";
import {
  CATEGORIES,
  CLASSIC_COLOURS,
  classicAssets,
  type ShopCategory,
} from "../services/shop/gallery";
import { coinHistory, openingHistory } from "../services/coins/history";
import { GameTypography } from "../theme/typography";
import { play } from "../services/audio/audioService";
const RED_RACER = SKINS.find((skin) => skin.id === "red_racer")!;
type Mode = "Shop" | "Inventory" | "Coin History";
export function ShopScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Shop">) {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  useFocusEffect(
    useCallback(() => {
      usePlayerStore.getState().hydrateFromStorage();
    }, [])
  );
  const [mode, setMode] = useState<Mode>("Shop");
  const [category, setCategory] = useState<ShopCategory>("car");
  const [preview, setPreview] = useState<number | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [message, setMessage] = useState("");
  const coins = usePlayerStore((s) => s.coins),
    owned = usePlayerStore((s) => s.unlockedSkins),
    selected = usePlayerStore((s) => s.selectedSkin);
  const buy = usePlayerStore((s) => s.buySkin),
    equip = usePlayerStore((s) => s.equipSkin);
  const panelWidth = Math.min(width - 16, 600),
    gridWidth = panelWidth - 28,
    columns = fontScale > 1.3 || width < 340 ? 2 : 3;
  const gridLayout = inventoryGridLayout(
    gridWidth,
    columns,
    fontScale,
    CLASSIC_COLOURS.length
  );
  const { tileWidth, carHeight } = gridLayout;
  const equippedSkins = usePlayerStore((s) => s.equippedSkins);
  const selectedIndexes = CLASSIC_COLOURS.map((c, i) =>
    equippedSkins[`${category}:${c.id}` as AppearanceSlot] ? -1 : i
  ).filter((i) => i >= 0);
  const changeMode = (next: Mode) => {
    if (next === "Coin History") openingHistory(coins);
    setMode(next);
    setMessage("");
  };
  const equipItem = (id: SkinId, colour: SkinColour = "red") => {
    try {
      setMessage(
        equip(id, category, colour)
          ? id === "default"
            ? `Default ${colour} ${category} equipped!`
            : "Red Racer equipped for red cars!"
          : "Finish restoring your account first."
      );
    } catch {
      setMessage("Could not save the selection. Please try again.");
    }
  };
  const purchase = () => {
    setPurchaseError("");
    setPurchaseOpen(true);
  };
  const confirmPurchase = () => {
    try {
      const result = buy(RED_RACER.id);
      if (result === "purchased") {
        play("coin");
        setPurchaseOpen(false);
        setMode("Inventory");
        setMessage("Red Racer is yours! Equip it for red cars below.");
      } else if (result === "owned") {
        setPurchaseOpen(false);
        setMode("Inventory");
      } else
        setPurchaseError(
          result === "insufficient"
            ? "Not enough coins. Earn more from levels, Daily or Awards."
            : "Finish restoring your account first."
        );
    } catch {
      setPurchaseError(
        "Could not finish saving. Retry safely; you will not be charged twice."
      );
    }
  };
  const history = mode === "Coin History" ? [...coinHistory()].reverse() : [];
  const showRacer =
    category === "car" && (mode === "Shop" || owned.includes("red_racer"));
  return (
    <View style={styles.root}>
      <Image
        source={require("../../assets/ui/bg/city_bg.webp")}
        resizeMode="cover"
        style={[styles.background, { width, height }]}
        accessible={false}
      />
      <View pointerEvents="none" style={styles.scrim} />
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <CoinPill />
      </View>
      <View style={styles.utilities}>
        {(["Shop", "Inventory", "Coin History"] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === t }}
            onPress={() => changeMode(t)}
            style={[styles.utility, mode === t && styles.utilityActive]}
          >
            <Text
              style={[
                styles.utilityText,
                mode === t && styles.utilityTextActive,
              ]}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      {mode === "Coin History" ? (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          windowSize={3}
          contentContainerStyle={[
            styles.historyList,
            { paddingBottom: insets.bottom + 20 },
          ]}
          ListHeaderComponent={
            <View>
              <Text style={styles.historyTitle}>Coin History</Text>
              <Text style={styles.note}>
                Latest 200 entries on this device, recorded from this update.
                Cloud restores are balance checkpoints; older activity is
                unavailable.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.historyHeading}>
                <Text style={styles.historyLabel}>{item.label}</Text>
                <Text style={[styles.amount, item.amount < 0 && styles.spent]}>
                  {item.amount > 0 ? "+" : ""}
                  {item.amount === 0 ? "—" : item.amount}
                </Text>
              </View>
              <Text style={styles.note}>
                {new Date(item.at).toLocaleString()}
              </Text>
              <Text style={styles.balance}>Balance: {item.balance} coins</Text>
            </View>
          )}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 18 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.hero,
              {
                width: Math.min(width - 48, 420),
              },
            ]}
          >
            <Image
              source={require("../../assets/ui/shop/header.webp")}
              resizeMode="contain"
              style={styles.heroArt}
              accessible
              accessibilityLabel="Shop"
            />
            <View pointerEvents="none" style={styles.taglineBand}>
              <Text
                style={styles.tagline}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                allowFontScaling={false}
              >
                Customize your ride and make it yours!
              </Text>
            </View>
          </View>
          <View style={[styles.categories, { width: panelWidth - 16 }]}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: category === c.id }}
                onPress={() => {
                  setCategory(c.id);
                  setMessage("");
                }}
                style={[
                  styles.category,
                  category === c.id && styles.categoryActive,
                ]}
              >
                <Image
                  source={c.icon}
                  style={styles.categoryIcon}
                  resizeMode="contain"
                  accessible={false}
                />
                <Text
                  style={[
                    styles.categoryText,
                    category === c.id && styles.categoryTextActive,
                  ]}
                >
                  {c.title}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.panel, { width: panelWidth }]}>
            {message ? (
              <Text accessibilityLiveRegion="polite" style={styles.message}>
                {message}
              </Text>
            ) : null}
            {mode === "Inventory" ? (
              <>
                <Text style={styles.collectionLabel}>
                  Your inventory{" "}
                  <Text style={styles.includedLabel}>
                    · a separate look for each colour
                  </Text>
                </Text>
                <View style={{ width: gridWidth }}>
                  <ShopGridBackdrop
                    layout={gridLayout}
                    selectedIndexes={selectedIndexes}
                  />
                  <View style={[styles.grid, { height: gridLayout.height }]}>
                    {CLASSIC_COLOURS.map((c, i) => (
                      <View
                        key={c.id}
                        style={[styles.tile, gridLayout.frames[i]]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${c.title} ${category}, ${
                            selectedIndexes.includes(i)
                              ? "equipped"
                              : "tap to equip"
                          }`}
                          accessibilityState={{
                            selected: selectedIndexes.includes(i),
                          }}
                          onPress={() => equipItem("default", c.id)}
                          onLongPress={() => setPreview(i)}
                          style={styles.artTarget}
                        >
                          <Image
                            source={classicAssets[category][i]}
                            resizeMode="contain"
                            style={{ width: tileWidth - 18, height: carHeight }}
                            accessible={false}
                          />
                        </Pressable>
                        <Text style={styles.tileTitle}>{c.title}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            selectedIndexes.includes(i)
                              ? `${c.title} equipped`
                              : `Equip ${c.title} ${category}`
                          }
                          onPress={() => equipItem("default", c.id)}
                          accessibilityState={{
                            selected: selectedIndexes.includes(i),
                          }}
                          style={styles.tileAction}
                        >
                          <Text
                            style={[
                              styles.tileActionText,
                              selectedIndexes.includes(i) &&
                                styles.equippedText,
                            ]}
                          >
                            {selectedIndexes.includes(i) ? "Equipped" : "Equip"}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            ) : null}
            {showRacer ? (
              <View style={styles.premiumSection}>
                <Text style={styles.sectionTitle}>
                  {mode === "Inventory" ? "Your purchased cars" : "Car skins"}
                </Text>
                <View
                  style={[
                    styles.racerCard,
                    mode === "Inventory" &&
                      selected === "red_racer" &&
                      styles.racerEquipped,
                  ]}
                >
                  <Image
                    source={skinAssets.red_racer}
                    resizeMode="contain"
                    style={styles.racerArt}
                    accessible
                    accessibilityLabel="Red Racer sports coupe preview"
                  />
                  <View style={styles.racerCopy}>
                    <Text style={styles.racerTitle}>Red Racer</Text>
                    <Text style={styles.racerDescription}>
                      Golden stripes. A sporty new look for red compact cars.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        mode === "Shop" && owned.includes("red_racer")
                          ? "Red Racer owned"
                          : selected === "red_racer"
                          ? "Red Racer equipped"
                          : owned.includes("red_racer")
                          ? "Equip Red Racer"
                          : `Buy Red Racer for ${RED_RACER.price} coins`
                      }
                      disabled={
                        mode === "Shop"
                          ? owned.includes("red_racer")
                          : selected === "red_racer"
                      }
                      onPress={() =>
                        owned.includes("red_racer")
                          ? equipItem("red_racer")
                          : purchase()
                      }
                      style={({ pressed }) => [
                        styles.buyButton,
                        mode === "Inventory" &&
                          selected === "red_racer" &&
                          styles.equippedButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      {!owned.includes("red_racer") ? (
                        <Image
                          source={require("../../assets/ui/icons/coin.webp")}
                          style={styles.smallCoin}
                          accessible={false}
                        />
                      ) : null}
                      <Text style={styles.buyText}>
                        {mode === "Shop" && owned.includes("red_racer")
                          ? "Owned"
                          : selected === "red_racer"
                          ? "Equipped"
                          : owned.includes("red_racer")
                          ? "Equip"
                          : RED_RACER.price}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
            {mode === "Shop" && !showRacer ? (
              <View style={styles.emptyState}>
                <Text style={styles.sectionTitle}>
                  No {category === "truck" ? "truck" : "bus"} skins for sale yet
                </Text>
                <Text style={styles.note}>
                  Your free vehicles are in Inventory. New cosmetics will appear
                  here when available.
                </Text>
              </View>
            ) : null}
            <Text style={styles.footer}>
              {mode === "Shop"
                ? "Purchased skins appear in Inventory. Equip them there."
                : "Each skin replaces its matching vehicle type and colour only. Hold a vehicle to preview."}
            </Text>
          </View>
        </ScrollView>
      )}
      <PurchasePopup
        visible={purchaseOpen}
        title={RED_RACER.title}
        price={RED_RACER.price}
        balance={coins}
        source={skinAssets.red_racer}
        description="Replaces red compact cars only. Other colours and vehicle types stay unchanged. Equip it after purchase."
        error={purchaseError}
        onClose={() => setPurchaseOpen(false)}
        onBuy={confirmPurchase}
      />
      <Modal
        visible={preview !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.previewCard}>
            <Text style={styles.sectionTitle}>
              {preview === null ? "" : CLASSIC_COLOURS[preview].title}
            </Text>
            <Image
              source={classicAssets[category][preview ?? 0]}
              resizeMode="contain"
              style={styles.largePreview}
            />
            <Text style={styles.previewNote}>
              This is the default look for this colour only. Other vehicle
              colours keep their own skins.
            </Text>
            {preview !== null &&
            !!equippedSkins[
              `${category}:${CLASSIC_COLOURS[preview].id}` as AppearanceSlot
            ] ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  equipItem("default", CLASSIC_COLOURS[preview ?? 0].id);
                  setPreview(null);
                }}
                style={styles.buyButton}
              >
                <Text style={styles.buyText}>Equip this look</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setPreview(null)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Close preview</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#102d4d" },
  background: { position: "absolute", top: 0, left: 0 },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#08203938",
  },
  topbar: {
    paddingHorizontal: 16,
    paddingRight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  utilities: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  utility: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#102c4de8",
    borderColor: "#4d81b7",
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  utilityActive: { backgroundColor: "#ffdf32", borderColor: "#fff5b5" },
  utilityText: { color: "#e2edff", fontSize: 12, fontWeight: "800" },
  utilityTextActive: { color: "#142b47" },
  scroll: { alignItems: "center" },
  hero: {
    aspectRatio: 3,
    alignItems: "center",
    marginTop: 3,
    marginBottom: 9,
  },
  heroArt: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  // Coordinates follow the subtitle strip in the 720x240 artwork.
  taglineBand: {
    position: "absolute",
    left: "7%",
    right: "7%",
    top: "69%",
    height: "20%",
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    color: "#dbedff",
    fontFamily: GameTypography.display,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
    textAlign: "center",
    width: "100%",
  },
  categories: { flexDirection: "row", gap: 4, marginBottom: -1, zIndex: 1 },
  category: {
    flex: 1,
    minHeight: 45,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderWidth: 2,
    borderColor: "#316699",
    backgroundColor: "#102d4ff5",
    paddingHorizontal: 4,
  },
  categoryActive: { backgroundColor: "#ffdd25", borderColor: "#fff4a1" },
  categoryIcon: { width: 22, height: 29, transform: [{ rotate: "180deg" }] },
  categoryText: {
    fontFamily: GameTypography.display,
    fontSize: 13,
    color: "#cee4ff",
  },
  categoryTextActive: { color: "#081c32" },
  panel: {
    borderWidth: 2,
    borderColor: "#2e73ae",
    borderRadius: 22,
    padding: 12,
    backgroundColor: "#0e2b4aed",
  },
  collectionLabel: {
    color: "#fff4b3",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 10,
  },
  includedLabel: { color: "#cfdded", fontWeight: "500" },
  grid: { position: "relative" },
  tile: { position: "absolute", paddingTop: 10, alignItems: "center" },
  artTarget: { alignItems: "center", justifyContent: "center" },
  tileTitle: {
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 5,
    paddingHorizontal: 4,
    flex: 1,
  },
  tileAction: {
    height: 51,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
  },
  tileActionText: {
    fontFamily: GameTypography.display,
    fontSize: 13,
    color: "#173250",
  },
  equippedText: { color: "#fff" },
  sectionTitle: {
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 9,
  },
  premiumSection: { marginBottom: 2 },
  racerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    padding: 12,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#edb94e",
    backgroundColor: "#581d34",
  },
  racerEquipped: { borderColor: "#fff36c" },
  racerArt: { width: 71, height: 147 },
  racerCopy: { flex: 1, gap: 9 },
  racerTitle: {
    color: "#ffdd42",
    fontFamily: GameTypography.display,
    fontSize: 23,
  },
  racerDescription: { color: "#ffeaef", fontSize: 12, lineHeight: 18 },
  buyButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "#ffdb25",
    borderColor: "#fff5a1",
    borderWidth: 1.5,
    borderBottomWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buyText: {
    color: "#142c4a",
    fontFamily: GameTypography.display,
    fontSize: 18,
  },
  smallCoin: { width: 29, height: 29 },
  equippedButton: { backgroundColor: "#43d833", borderColor: "#8bf272" },
  pressed: { transform: [{ scale: 0.97 }] },
  comingBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ad5ce4",
    borderBottomWidth: 5,
    borderRadius: 17,
    backgroundColor: "#4f2097",
    padding: 12,
    minHeight: 104,
  },
  mystery: {
    width: 74,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  silhouette: { width: 65, height: 88, tintColor: "#090d24" },
  question: {
    position: "absolute",
    color: "#e8b0ff",
    fontSize: 46,
    fontFamily: GameTypography.display,
  },
  bannerCopy: { flex: 1 },
  bannerTitle: {
    color: "#ffdf32",
    fontFamily: GameTypography.display,
    fontSize: 23,
    textShadowColor: "#110b36",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  bannerSubtitle: {
    color: "#ead5ff",
    fontFamily: GameTypography.display,
    fontSize: 12,
    marginTop: 5,
  },
  footer: {
    color: "#bccfe6",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
    textAlign: "center",
  },
  message: {
    color: "#ffec83",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "700",
    fontSize: 13,
  },
  emptyState: { paddingVertical: 24, alignItems: "center", gap: 12 },
  historyList: { padding: 16, gap: 12 },
  historyTitle: {
    fontFamily: GameTypography.display,
    color: "#fff",
    fontSize: 30,
    marginBottom: 12,
  },
  note: { color: "#cfdef1", fontSize: 12, lineHeight: 18 },
  historyCard: {
    backgroundColor: "#183657",
    borderWidth: 1,
    borderColor: "#4a7ab4",
    borderRadius: 18,
    padding: 16,
    gap: 5,
  },
  historyHeading: { flexDirection: "row", gap: 12 },
  historyLabel: { color: "#fff", fontWeight: "700", fontSize: 15, flex: 1 },
  amount: {
    color: "#b2f5c6",
    fontFamily: GameTypography.display,
    fontSize: 19,
  },
  spent: { color: "#ffbb9c" },
  balance: { color: "#ffe66a", fontSize: 12 },
  modalScrim: {
    flex: 1,
    backgroundColor: "#041329dc",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  previewCard: {
    width: "100%",
    maxWidth: 340,
    padding: 22,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#4d98e3",
    backgroundColor: "#183657",
    alignItems: "center",
    gap: 12,
  },
  largePreview: { width: 120, height: 246 },
  previewNote: {
    color: "#d7e8ff",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
  },
  closeButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  closeText: {
    color: "#ffe36a",
    fontFamily: GameTypography.display,
    fontSize: 17,
  },
});
