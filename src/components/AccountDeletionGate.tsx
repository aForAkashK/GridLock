import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAccountStore } from "../state/accountStore";
import { deleteAccountInApp } from "../services/auth/accountDeletion";
import { getJSON, StorageKeys } from "../services/storage/mmkv";
import { GameTypography } from "../theme/typography";

export function AccountDeletionGate({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const { pendingDeletion, deletionComplete, busy, error } = useAccountStore();
  return (
    <Modal
      visible={pendingDeletion || deletionComplete}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.scrim}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.card}
          accessibilityViewIsModal
        >
          <Text style={styles.title}>
            {deletionComplete ? "Account deleted" : "Deleting your account"}
          </Text>
          <Text style={styles.body}>
            {deletionComplete
              ? "Your game account, cloud save and local progress have been deleted. Your Google account is unchanged. A minimal security marker blocks old save uploads. Continuing starts a new game."
              : error ||
                "Removing your cloud save and account. Please keep your connection on. If interrupted, reopen the app and retry."}
          </Text>
          {busy ? (
            <ActivityIndicator color="#ffdf35" />
          ) : deletionComplete ? (
            <Pressable
              accessibilityRole="button"
              onPress={onContinue}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Continue with a new game</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                deleteAccountInApp().catch(() => {});
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Retry deletion</Text>
            </Pressable>
          )}
          {!deletionComplete ? (
            <Text style={styles.note}>
              Need help? akssoft.feedback@gmail.com
            </Text>
          ) : null}
          {pendingDeletion ? (
            <Text selectable style={styles.note}>
              Player ID:{" "}
              {getJSON<{ uid?: string } | null>(
                StorageKeys.pendingAccountDeletion,
                null
              )?.uid ?? "unavailable"}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: "#031124e6",
  },
  scroll: {
    flexGrow: 0,
    maxHeight: "90%",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    backgroundColor: "#12345a",
    borderRadius: 24,
    borderColor: "#4da7e7",
    borderWidth: 2,
    padding: 24,
    gap: 18,
  },
  title: {
    fontFamily: GameTypography.display,
    fontSize: 25,
    color: "#fff",
    textAlign: "center",
  },
  body: { fontSize: 15, color: "#dbeaff", lineHeight: 22, textAlign: "center" },
  note: { fontSize: 12, color: "#c7daee", textAlign: "center" },
  button: {
    backgroundColor: "#ffdf35",
    padding: 15,
    minHeight: 48,
    borderRadius: 14,
  },
  buttonText: {
    fontFamily: GameTypography.display,
    fontSize: 17,
    color: "#18314d",
    textAlign: "center",
  },
});
