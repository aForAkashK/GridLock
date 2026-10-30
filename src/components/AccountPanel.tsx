import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAccountStore } from "../state/accountStore";
import {
  connectGoogle,
  restoreExistingGoogleSave,
} from "../services/auth/accountRecovery";
import {
  dismissExistingGoogleSave,
  isAccountLinkingConfigured,
} from "../services/auth/authService";
import { AccountDeletionConfirm } from "./AccountDeletionConfirm";
import { deleteAccountInApp } from "../services/auth/accountDeletion";
import { Home, Radius, Spacing } from "../theme/tokens";

export function AccountPanel() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirming = useRef(false);
  const user = useAccountStore((s) => s.user);
  const busy = useAccountStore((s) => s.busy);
  const error = useAccountStore((s) => s.error);
  const connected = user?.hasRecoverableIdentity === true;
  const configured = isAccountLinkingConfigured();
  const beginConfirmedDeletion = () => {
    if (!confirming.current) return;
    confirming.current = false;
    deleteAccountInApp().catch(() => {});
  };
  const connect = async () => {
    try {
      const outcome = await connectGoogle();
      if (outcome === "existing") {
        Alert.alert(
          "Use your Google save?",
          "Your completed levels will be combined. The coin balance from your Google save will be used; balances are not added together.",
          [
            {
              text: "Keep this save",
              style: "cancel",
              onPress: dismissExistingGoogleSave,
            },
            {
              text: "Use Google save",
              onPress: () => {
                restoreExistingGoogleSave().catch(() => {});
              },
            },
          ]
        );
      }
    } catch {
      /* Error is displayed inline; gameplay never depends on linking. */
    }
  };
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Save your progress</Text>
      <Text style={styles.body}>
        {connected
          ? "Connected to Google. Your coins and completed levels sync when online."
          : "Connect Google to recover coins and levels after reinstalling or changing devices."}
      </Text>
      {!connected ? (
        <Pressable
          disabled={!configured || busy}
          onPress={connect}
          accessibilityRole="button"
          accessibilityLabel="Connect Google to save progress"
          style={[styles.button, (!configured || busy) && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Connect Google</Text>
          )}
        </Pressable>
      ) : null}
      {!configured && !connected ? (
        <Text style={styles.body}>
          Account recovery is unavailable in this build. Your progress is saved
          on this device.
        </Text>
      ) : null}
      {user ? (
        <Text selectable style={styles.body}>
          Player ID: {user.uid}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete game account permanently"
        disabled={busy || !user}
        onPress={() => {
          confirming.current = false;
          setConfirmDelete(true);
        }}
        style={[styles.deleteButton, (busy || !user) && styles.disabled]}
      >
        <Text style={styles.deleteText}>Delete account</Text>
      </Pressable>
      <AccountDeletionConfirm
        visible={confirmDelete}
        onCancel={() => {
          confirming.current = false;
          setConfirmDelete(false);
        }}
        onDismiss={beginConfirmedDeletion}
        onConfirm={() => {
          if (confirming.current || useAccountStore.getState().busy) return;
          confirming.current = true;
          setConfirmDelete(false);
          // iOS must dismiss this modal before presenting Google verification.
          if (Platform.OS !== "ios")
            requestAnimationFrame(beginConfirmedDeletion);
        }}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  deleteButton: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ed9d9d",
    padding: 10,
  },
  deleteText: { color: "#ffbaba", fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.55 },
  card: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Home.chrome,
    gap: Spacing.sm,
  },
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
  body: { color: "#FFFFFF", fontSize: 13, lineHeight: 19 },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Home.playRim,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
