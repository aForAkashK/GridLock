import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Canvas,
  LinearGradient,
  Path,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import { GameTypography } from "../theme/typography";

/** Small static UI symbols; no raster decode, animation or new artwork. */
function WarningIcon() {
  return (
    <Canvas style={styles.warning} pointerEvents="none" accessible={false}>
      <Path
        path="M43 7 Q48 0 53 7 L91 72 Q97 83 84 85 L12 85 Q0 83 5 72 Z"
        color="#81300b"
      />
      <Path path="M43 4 Q48 -1 53 4 L88 66 Q95 78 83 80 L13 80 Q1 78 8 66 Z">
        <LinearGradient
          start={vec(20, 0)}
          end={vec(70, 80)}
          colors={["#fff88a", "#ffe32c", "#ffad00"]}
        />
      </Path>
      <Path
        path="M43 4 Q48 -1 53 4 L88 66 Q95 78 83 80 L13 80 Q1 78 8 66 Z"
        style="stroke"
        strokeWidth={3}
        color="#c83712"
      />
      <RoundedRect x={43} y={23} width={10} height={31} r={4} color="#e52429" />
      <RoundedRect x={43} y={60} width={10} height={10} r={5} color="#bd1927" />
    </Canvas>
  );
}
function TrashIcon() {
  return (
    <Canvas style={styles.trash} pointerEvents="none" accessible={false}>
      <RoundedRect x={27} y={8} width={36} height={20} r={8} color="#651d30" />
      <RoundedRect x={32} y={13} width={26} height={12} r={4} color="#ff7772" />
      <Path
        path="M16 35 L74 35 L68 85 Q67 93 58 93 L31 93 Q22 93 21 85 Z"
        color="#5a1829"
      />
      <Path path="M22 37 L68 37 L62 82 Q62 86 56 86 L34 86 Q28 86 28 81 Z">
        <LinearGradient
          start={vec(24, 35)}
          end={vec(65, 90)}
          colors={["#ff7664", "#ff2c34", "#c90728"]}
        />
      </Path>
      <RoundedRect x={11} y={23} width={68} height={19} r={7} color="#651d30" />
      <RoundedRect x={16} y={26} width={58} height={10} r={4} color="#ff5656" />
      <RoundedRect
        x={20}
        y={27}
        width={45}
        height={3}
        r={1.5}
        color="#ffb09c"
      />
      {[34, 44, 54].map((x) => (
        <RoundedRect
          key={x}
          x={x}
          y={49}
          width={5}
          height={29}
          r={2.5}
          color="#9f1230"
        />
      ))}
    </Canvas>
  );
}
function Gloss({ danger = false }: { danger?: boolean }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={({ nativeEvent: { layout } }) =>
        setSize((old) =>
          old.width === layout.width && old.height === layout.height
            ? old
            : { width: layout.width, height: layout.height }
        )
      }
    >
      {size.width > 12 && size.height > 12 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <RoundedRect
            x={1}
            y={5}
            width={size.width - 2}
            height={size.height - 6}
            r={18}
            color={danger ? "#67091b" : "#072858"}
          />
          <RoundedRect
            x={2}
            y={1}
            width={size.width - 4}
            height={size.height - 9}
            r={18}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, size.height)}
              colors={
                danger
                  ? ["#ff6665", "#fa1a2c", "#c70422"]
                  : ["#36caff", "#0788fa", "#074dca"]
              }
            />
          </RoundedRect>
          <RoundedRect
            x={5}
            y={4}
            width={size.width - 10}
            height={size.height - 16}
            r={15}
            style="stroke"
            strokeWidth={2}
            color={danger ? "#ffb098" : "#84e7ff"}
          />
        </Canvas>
      ) : null}
    </View>
  );
}
export function AccountDeletionConfirm({
  visible,
  onCancel,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const stackActions = width < 340 || fontScale > 1.3;
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onCancel}
      onDismiss={onDismiss}
    >
      <View style={styles.scrim}>
        <View style={styles.composition} accessibilityViewIsModal>
          <View style={styles.panel}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                <Text style={styles.gold}>Delete</Text> your game account?
              </Text>
            </View>
            <View style={styles.body}>
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.bodyCopy}
                bounces={false}
              >
                <View style={styles.descriptionRow}>
                  {!stackActions ? (
                    <View style={styles.artWell}>
                      <TrashIcon />
                    </View>
                  ) : null}
                  <Text style={styles.description}>
                    This{" "}
                    <Text style={styles.emphasis}>permanently deletes</Text>{" "}
                    your game account, cloud save, coins, progress, skins and
                    ad-free passes, plus this device’s local history and
                    settings.
                  </Text>
                </View>
                <View style={styles.divider} />
                <Text style={styles.note}>
                  Your Google account is not deleted. A connection is required;
                  Google-linked players must verify their account. A minimal
                  security marker prevents old devices from restoring deleted
                  data.
                </Text>
              </ScrollView>
              <View
                style={[styles.actions, stackActions && styles.stackedActions]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.button,
                    stackActions && styles.stackedButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Gloss />
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete account permanently"
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.button,
                    stackActions && styles.stackedButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Gloss danger />
                  <Text style={styles.deleteText}>Delete Permanently</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <WarningIcon />
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
    backgroundColor: "#031124cf",
  },
  bodyScroll: { flexGrow: 0, flexShrink: 1 },
  bodyCopy: { gap: 16 },
  composition: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "100%",
    flexShrink: 1,
    alignSelf: "center",
    paddingTop: 45,
  },
  panel: {
    flexShrink: 1,
    backgroundColor: "#f52634",
    borderColor: "#8e1521",
    borderWidth: 3,
    borderBottomWidth: 7,
    borderRadius: 29,
    padding: 4,
  },
  header: {
    flexShrink: 0,
    paddingTop: 39,
    paddingBottom: 18,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderColor: "#ff9391",
    borderRadius: 24,
  },
  title: {
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 27,
    textAlign: "center",
    textShadowColor: "#7b1428",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 1,
  },
  gold: { color: "#ffdf3c" },
  body: {
    flexShrink: 1,
    borderRadius: 23,
    backgroundColor: "#fff3de",
    borderColor: "#f6ca99",
    borderWidth: 2,
    padding: 17,
    gap: 16,
  },
  warning: {
    position: "absolute",
    top: 0,
    width: 96,
    height: 90,
    alignSelf: "center",
  },
  descriptionRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 13,
  },
  artWell: {
    width: 94,
    height: 106,
    backgroundColor: "#ffd5c9",
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  trash: { width: 90, height: 100 },
  description: {
    flexGrow: 1,
    flexBasis: 170,
    color: "#293d59",
    fontSize: 15,
    lineHeight: 22,
  },
  emphasis: { color: "#d91635", fontWeight: "800" },
  divider: { height: 2, backgroundColor: "#efd8bb", borderRadius: 2 },
  note: { color: "#4e6176", fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, flexShrink: 0 },
  stackedActions: { flexDirection: "column" },
  stackedButton: { flexBasis: "auto", flexGrow: 0, width: "100%" },
  button: {
    flexGrow: 1,
    flexBasis: 130,
    minWidth: 120,
    minHeight: 65,
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 22,
    textAlign: "center",
    textShadowColor: "#153561",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  deleteText: {
    color: "#fff",
    fontFamily: GameTypography.display,
    fontSize: 17,
    textAlign: "center",
    textShadowColor: "#741225",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  pressed: { transform: [{ scale: 0.97 }] },
});
