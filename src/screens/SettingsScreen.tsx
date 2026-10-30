import {
  crashReportingEnabled,
  setCrashReporting,
  shareSupportReport,
  supportCode,
} from "../services/diagnostics/runtime";
import { BackButton } from "../components/navigation/BackButton";
/**
 * Settings. Sound, music and haptics; each persists to MMKV on toggle.
 */

import { showAdPrivacy } from "../services/ads/adService";
import React, { useState } from "react";
import { PUBLISHER } from "../config/publisher";
import { AccountPanel } from "../components/AccountPanel";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenBackground } from "../components/home/ScreenBackground";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSettingsStore } from "../state/settingsStore";
import type { RootStackParamList } from "../navigation/types";
import { GameTypography } from "../theme/typography";
import { Home, Radius, Spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

type ToggleKey = "soundEnabled" | "musicEnabled" | "hapticsEnabled";

const ROWS: Array<{ key: ToggleKey; label: string }> = [
  { key: "soundEnabled", label: "Sound effects" },
  { key: "musicEnabled", label: "Background music" },
  { key: "hapticsEnabled", label: "Haptics" },
];

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [crashReports, setCrashReports] = useState(crashReportingEnabled);
  const [adMessage, setAdMessage] = useState("");
  const settings = useSettingsStore();

  return (
    <ScreenBackground>
      <ScrollView
        style={{ marginTop: insets.top }}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>Settings</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.list}>
          {ROWS.map((row) => (
            <Pressable
              key={row.key}
              onPress={() => settings.toggle(row.key)}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings[row.key] }}
              style={styles.row}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>
                {settings[row.key] ? "On" : "Off"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.volumeRow}>
          <Text style={styles.rowLabel}>Music volume</Text>
          <View style={styles.volumeControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Lower music volume"
              disabled={settings.musicVolume <= 0}
              onPress={() =>
                settings.setMusicVolume(settings.musicVolume - 0.1)
              }
              style={styles.volumeButton}
            >
              <Text style={styles.rowValue}>−</Text>
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={styles.volumeValue}>
              {Math.round(settings.musicVolume * 100)}%
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Raise music volume"
              disabled={settings.musicVolume >= 1}
              onPress={() =>
                settings.setMusicVolume(settings.musicVolume + 0.1)
              }
              style={styles.volumeButton}
            >
              <Text style={styles.rowValue}>+</Text>
            </Pressable>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("AdBenefits")}
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Coins & ad-free passes</Text>
          <Text style={styles.rowValue}>Open</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            showAdPrivacy()
              .then(() =>
                setAdMessage(
                  "Ad privacy choices updated, or no choices are required in your region."
                )
              )
              .catch(() =>
                setAdMessage(
                  "Ad privacy is unavailable. Check your connection and retry."
                )
              );
          }}
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Ad privacy choices</Text>
          <Text style={styles.rowValue}>Manage</Text>
        </Pressable>
        {adMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.note}>
            {adMessage}
          </Text>
        ) : null}
        <AccountPanel />
        <View style={styles.list}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: crashReports }}
            style={styles.row}
            onPress={() => {
              const next = !crashReports;
              setCrashReporting(next);
              setCrashReports(next);
            }}
          >
            <Text style={styles.rowLabel}>Automatic crash reports</Text>
            <Text style={styles.rowValue}>{crashReports ? "On" : "Off"}</Text>
          </Pressable>
          <Text style={styles.note}>
            Helps fix crashes using app and device diagnostics. We do not attach
            your email or cloud save.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.row}
            onPress={() => {
              shareSupportReport().catch(() =>
                Alert.alert(
                  "Could not share report",
                  "Please contact akssoft.feedback@gmail.com."
                )
              );
            }}
          >
            <Text style={styles.rowLabel}>Report a problem</Text>
            <Text style={styles.rowValue}>Share</Text>
          </Pressable>
          <Text selectable style={styles.note}>
            Support code: {supportCode()}
          </Text>
        </View>
        <View style={styles.links}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Email AksSoft support"
            onPress={() =>
              Linking.openURL(`mailto:${PUBLISHER.supportEmail}`).catch(() =>
                Alert.alert("Email support", PUBLISHER.supportEmail)
              )
            }
            style={styles.link}
          >
            <Text style={styles.linkText}>Email support</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              Linking.openURL(
                "https://gridlock-bee41-levels.web.app/privacy.html"
              ).catch(() => Alert.alert("Could not open privacy information"));
            }}
            style={styles.link}
          >
            <Text style={styles.linkText}>Privacy</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              Linking.openURL(
                "https://gridlock-bee41-levels.web.app/support.html"
              ).catch(() => Alert.alert("Could not open support"));
            }}
            style={styles.link}
          >
            <Text style={styles.linkText}>Support</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              Linking.openURL(
                "https://gridlock-bee41-levels.web.app/delete-account.html"
              ).catch(() =>
                Alert.alert("Could not open account-deletion information")
              );
            }}
            style={styles.link}
          >
            <Text style={styles.linkText}>Request account deletion</Text>
          </Pressable>
        </View>
        <View style={styles.publisher}>
          <Text style={styles.publisherName}>
            Developed by {PUBLISHER.name}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Developer portfolio"
            accessibilityHint="Opens portfolio-akash-kr.vercel.app"
            onPress={() => {
              Linking.openURL(PUBLISHER.portfolioUrl).catch(() =>
                Alert.alert("Could not open developer portfolio")
              );
            }}
            style={styles.portfolioLink}
          >
            <Text style={styles.linkText}>Developer portfolio</Text>
            <Text style={styles.portfolioUrl}>
              portfolio-akash-kr.vercel.app
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    alignSelf: "center",
    width: "100%",
    maxWidth: 560,
  },
  publisher: {
    marginTop: Spacing.sm,
    alignItems: "center",
    gap: Spacing.xs,
  },
  publisherName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  portfolioLink: {
    alignSelf: "stretch",
    minHeight: 48,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  portfolioUrl: {
    color: Home.coinGold,
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  volumeRow: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Home.chrome,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  volumeControls: { flexDirection: "row", alignItems: "center" },
  volumeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  volumeValue: {
    color: "#FFFFFF",
    fontSize: 15,
    minWidth: 44,
    textAlign: "center",
  },
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  link: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  linkText: { color: "#FFFFFF", fontSize: 14, textDecorationLine: "underline" },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    fontSize: 28,
    fontFamily: GameTypography.display,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  spacer: { width: 48 },
  list: { gap: Spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Home.chrome,
    borderWidth: 2,
    borderColor: Home.chromeBorder,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    flexShrink: 1,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  rowValue: {
    flexShrink: 0,
    color: Home.coinGold,
    fontSize: 16,
    fontWeight: "800",
  },
  note: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    paddingHorizontal: Spacing.lg,
  },
});
