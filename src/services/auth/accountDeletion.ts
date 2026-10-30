import { reportIssue, resetDiagnosticsForDeletion } from "../diagnostics/client";
import {
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import {
  getCurrentUid,
  removeAuthenticatedAccount,
  verifyDeletionIdentity,
} from "./authService";
import { runDeletion, deletionIntent } from "./deletionFlow";
import { storage, StorageKeys, getJSON, setJSON } from "../storage/mmkv";
import { discardPendingSync } from "../sync/syncQueue";
import { setSaveReady } from "./saveReadiness";
import { useAccountStore } from "../../state/accountStore";
import { usePlayerStore } from "../../state/playerStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useGameStore } from "../../state/gameStore";

let operation: Promise<void> | undefined;
export function deleteAccountInApp(): Promise<void> {
  if (operation) return operation;
  useAccountStore.setState({ busy: true, error: null });
  operation = runDeletion({
    read: () =>
      deletionIntent(getJSON(StorageKeys.pendingAccountDeletion, null)),
    uid: getCurrentUid,
    verify: verifyDeletionIdentity,
    write: (intent) => {
      setJSON(StorageKeys.pendingAccountDeletion, intent);
      setSaveReady(false);
      discardPendingSync();
      useAccountStore.setState({ pendingDeletion: true });
    },
    removeCloud: async (uid) => {
      const db = getFirestore();
      const marker = doc(db, "deletedPlayers", uid);
      // Server transaction fails offline; it cannot silently queue deletion.
      // The immutable marker and save removal commit together under rules.
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(marker);
        if (!snapshot.exists())
          transaction.set(marker, { deletedAt: serverTimestamp() });
        transaction.delete(doc(db, "players", uid));
      });
    },
    removeAuth: removeAuthenticatedAccount,
    clearLocal: () => {
      discardPendingSync();
      for (const key of Object.values(StorageKeys)) {
        if (
          key.startsWith("player.") ||
          key.startsWith("settings.") ||
          key === StorageKeys.pendingAccountRestore
        )
          storage.remove(key);
      }
      resetDiagnosticsForDeletion();
      useGameStore.setState({
        level: null,
        state: null,
        history: [],
        hintVehicleId: null,
        blockedAt: 0,
        blockedVehicleId: null,
        skipped: false,
      });
      usePlayerStore.getState().hydrateFromStorage();
      useSettingsStore.setState({
        soundEnabled: true,
        musicEnabled: true,
        musicVolume: 0.28,
        hapticsEnabled: true,
      });
    },
    finish: () => {
      storage.remove(StorageKeys.pendingAccountDeletion);
      useAccountStore.setState({
        user: null,
        pendingRestore: false,
        pendingDeletion: false,
        deletionComplete: true,
      });
    },
  })
    .catch((error: unknown) => {
      reportIssue("account.delete", error);
      const pending = Boolean(
        storage.getString(StorageKeys.pendingAccountDeletion)
      );
      const code = (error as { code?: string }).code;
      useAccountStore.setState({
        pendingDeletion: pending,
        error: pending
          ? "Deletion is not finished. Keep your connection on and retry. Your save will not be uploaded while deletion is pending."
          : code === "auth/user-mismatch"
          ? "Choose the Google account linked to this game. Nothing was deleted."
          : "Deletion was cancelled or could not start. Check your connection and try again. Nothing was deleted.",
      });
      throw error;
    })
    .finally(() => {
      operation = undefined;
      useAccountStore.setState({ busy: false });
    });
  return operation;
}
