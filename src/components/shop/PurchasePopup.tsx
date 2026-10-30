import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import {
  Canvas,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import { GameTypography } from "../../theme/typography";
type Props = {
  visible: boolean;
  title: string;
  price: number;
  balance: number;
  source: ImageSourcePropType;
  description: string;
  error: string;
  onClose: () => void;
  onBuy: () => void;
};
/** Static artwork backing only; item, price, error and actions are native and live. */
export function PurchasePopup({
  visible,
  title,
  price,
  balance,
  source,
  description,
  error,
  onClose,
  onBuy,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [headerHeight, setHeaderHeight] = useState(70);
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const stackActions = windowWidth < 340 || fontScale > 1.3;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.scrim}>
        <View
          accessibilityViewIsModal
          style={styles.panel}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setSize((old) =>
              old.width === width && old.height === height
                ? old
                : { width, height }
            );
          }}
        >
          {size.width > 0 ? (
            <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
              <RoundedRect
                x={2}
                y={6}
                width={size.width - 4}
                height={size.height - 8}
                r={27}
                color="#061b43"
              />
              <RoundedRect
                x={2}
                y={1}
                width={size.width - 4}
                height={size.height - 8}
                r={27}
              >
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, size.height)}
                  colors={["#159aff", "#0860db", "#1046a4"]}
                />
              </RoundedRect>
              <RoundedRect
                x={4}
                y={3}
                width={size.width - 8}
                height={size.height - 12}
                r={25}
                style="stroke"
                strokeWidth={2}
                color="#69d6ff"
              />
              <RoundedRect
                x={7}
                y={headerHeight - 2}
                width={size.width - 14}
                height={Math.max(size.height - headerHeight - 12, 1)}
                r={22}
              >
                <LinearGradient
                  start={vec(0, headerHeight - 2)}
                  end={vec(size.width, size.height)}
                  colors={["#fff9e8", "#fff1cf", "#f7ead6"]}
                />
              </RoundedRect>
              <RoundedRect
                x={11}
                y={headerHeight + 2}
                width={size.width - 22}
                height={Math.max(size.height - headerHeight - 20, 1)}
                r={19}
                style="stroke"
                strokeWidth={1.5}
                color="#fffdf6"
              />
            </Canvas>
          ) : null}
          <View
            style={styles.header}
            onLayout={({ nativeEvent: { layout } }) =>
              setHeaderHeight((old) =>
                old === layout.height ? old : layout.height
              )
            }
          >
            <Text accessibilityRole="header" style={styles.title}>
              Buy {title}?
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close purchase"
              hitSlop={4}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Text allowFontScaling={false} style={styles.cross}>
                ×
              </Text>
            </Pressable>
          </View>
          <ScrollView bounces={false} contentContainerStyle={styles.body}>
            <View style={styles.details}>
              <View style={styles.artWell}>
                <Image
                  source={source}
                  resizeMode="contain"
                  style={styles.art}
                  accessible
                  accessibilityLabel={`${title} preview`}
                />
              </View>
              <View style={styles.copy}>
                <Text style={styles.description}>{description}</Text>
                <View style={styles.pricePill}>
                  <Image
                    source={require("../../../assets/ui/icons/coin.webp")}
                    style={styles.coin}
                    accessible={false}
                  />
                  <Text style={styles.price}>{price}</Text>
                  <Text style={styles.coinsLabel}>coins</Text>
                </View>
                <Text style={styles.balance}>
                  Your balance: {balance} coins
                </Text>
              </View>
            </View>
            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <View
              style={[styles.actions, stackActions && styles.stackedActions]}
            >
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  styles.cancel,
                  stackActions && styles.stackedButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onBuy}
                accessibilityRole="button"
                accessibilityLabel={`Confirm purchase of ${title} for ${price} coins`}
                style={({ pressed }) => [
                  styles.button,
                  styles.buy,
                  stackActions && styles.stackedButton,
                  pressed && styles.pressed,
                ]}
              >
                <Image
                  source={require("../../../assets/ui/icons/coin.webp")}
                  style={styles.buttonCoin}
                  accessible={false}
                />
                <Text style={styles.buttonText}>Buy · {price}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "#031124d9",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  panel: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    paddingBottom: 17,
    borderRadius: 28,
    backgroundColor: "#0866d2",
  },
  header: {
    minHeight: 70,
    paddingVertical: 10,
    paddingLeft: 18,
    paddingRight: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 24,
    textAlign: "center",
    textShadowColor: "#063876",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  close: {
    width: 43,
    height: 43,
    borderRadius: 13,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: "#a7181b",
    backgroundColor: "#ff4a4a",
    alignItems: "center",
    justifyContent: "center",
  },
  cross: { color: "#fff", fontSize: 35, fontWeight: "900", lineHeight: 36 },
  body: { padding: 19, paddingTop: 15, gap: 17 },
  details: { flexDirection: "row", gap: 15, alignItems: "center" },
  artWell: {
    width: "32%",
    borderRadius: 40,
    backgroundColor: "#ffdf7b40",
    paddingVertical: 9,
  },
  art: { width: "100%", height: 192 },
  copy: { flex: 1, gap: 12 },
  description: { color: "#504b62", fontSize: 14, lineHeight: 20 },
  pricePill: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 57,
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: "#e9cea0",
    backgroundColor: "#fff2d3",
  },
  coin: { width: 32, height: 32 },
  price: { color: "#102a4b", fontFamily: GameTypography.display, fontSize: 25 },
  coinsLabel: { color: "#73647b", fontWeight: "800", fontSize: 11 },
  balance: { fontSize: 11, color: "#696176", textAlign: "center" },
  actions: { flexDirection: "row", gap: 12 },
  stackedActions: { flexDirection: "column" },
  stackedButton: { flex: 0 },
  button: {
    flex: 1,
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  cancel: { backgroundColor: "#0786fc", borderColor: "#0453b7" },
  buy: { backgroundColor: "#16cb20", borderColor: "#078b22" },
  buttonText: {
    flexShrink: 1,
    textAlign: "center",
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 17,
    textShadowColor: "#164165",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  buttonCoin: { width: 25, height: 25 },
  pressed: { transform: [{ scale: 0.96 }] },
  error: {
    color: "#a5342a",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 13,
  },
});
