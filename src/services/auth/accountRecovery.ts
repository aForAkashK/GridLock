import { breadcrumb, reportIssue } from "../diagnostics/client";
import { setSaveReady } from "./saveReadiness";
import { readMonetization } from "../ads/rewardService";
import { readInventory } from "../shop/shopService";
import { restoredHistory } from "../coins/history";
import { recoverCoinTransaction } from "../coins/transaction";
/** Explicit account management; never called from a gameplay tap. */
import {
  getCurrentUser,
  linkAccount,
  signInExistingGoogleSave,
  ExistingGoogleSaveError,
  AccountLinkCancelledError,
} from "./authService";
import { useAccountStore } from "../../state/accountStore";
import { usePlayerStore } from "../../state/playerStore";
import {
  storage,
  StorageKeys,
  getJSON,
  getNumber,
  setJSON,
} from "../storage/mmkv";
import { fetchCloudPlayerState } from "../sync/mergeOnLaunch";
import { flush, queueSync, startSyncQueue } from "../sync/syncQueue";
import { recoverAwardClaim } from "../awards/ledger";
import { readAwardsProgress } from "../awards/storage";
import { hasAwardsProgress } from "../awards/policy";
import { STARTING_COINS } from "../coins/economy";
import { recoverDailyClaim } from "../coins/dailyLedger";
import { parseDailyRecord } from "../rewards/dailyPolicy";
import { recoveredPlayer } from "./recoveryPolicy";

export function refreshAccountStatus(): void {
  useAccountStore.setState({ user: getCurrentUser() });
}

export async function connectGoogle(): Promise<
  "linked" | "existing" | "cancelled"
> {
  recoverDailyClaim();
  recoverAwardClaim();
  recoverCoinTransaction();
  useAccountStore.setState({ busy: true, error: null });
  try {
    const user = await linkAccount("google");
    useAccountStore.setState({ user });
    if (storage.getNumber(StorageKeys.coins) === undefined) {
      storage.set(StorageKeys.coins, STARTING_COINS);
      storage.set(StorageKeys.syncVersion, 0);
    }
    queueSync("progress");
    flush();
    breadcrumb("account.linked", { provider: "google" });
    return "linked";
  } catch (error) {
    if (error instanceof ExistingGoogleSaveError) {
      return "existing";
    }
    if (error instanceof AccountLinkCancelledError) {
      return "cancelled";
    }
    reportIssue("account.link", error);
    useAccountStore.setState({
      error: "Could not connect. Check your connection and try again.",
    });
    throw error;
  } finally {
    useAccountStore.setState({ busy: false });
  }
}

export async function finishPendingRecovery(): Promise<void> {
  recoverDailyClaim();
  recoverAwardClaim();
  recoverCoinTransaction();
  const pending = storage.getString(StorageKeys.pendingAccountRestore);
  if (!pending) {
    return;
  }
  const user = getCurrentUser();
  if (pending === "switching" && user?.isAnonymous) {
    // Crash/cancellation before Firebase changed identity: keep the local save.
    storage.remove(StorageKeys.pendingAccountRestore);
    setSaveReady(true);
    useAccountStore.setState({ pendingRestore: false, busy: false });
    return;
  }
  useAccountStore.setState({ pendingRestore: true, busy: true, error: null });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!user || (pending !== "switching" && pending !== user.uid)) {
      throw new Error("Recovery account unavailable");
    }
    const cloud = await Promise.race([
      fetchCloudPlayerState(user.uid, true),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Recovery timed out")), 8000);
      }),
    ]);
    const dailyReward = parseDailyRecord(
      getJSON(StorageKeys.dailyReward, null)
    );
    const awards = readAwardsProgress();
    const local = {
      monetization: readMonetization(),
      inventory: readInventory(),
      ...(hasAwardsProgress(awards) ? { awardsProgress: awards } : {}),
      ...(dailyReward ? { dailyReward } : {}),
      coins: getNumber(StorageKeys.coins, STARTING_COINS),
      syncVersion: getNumber(StorageKeys.syncVersion, 0),
      completedLevels: getJSON<number[]>(StorageKeys.completedLevels, []),
      currentLevel: getNumber(StorageKeys.currentLevel, 1),
    };
    const merged = recoveredPlayer(
      local,
      cloud
        ? {
            ...cloud,
            completedLevels: cloud.completedLevels ?? [],
            currentLevel: cloud.currentLevel ?? 1,
          }
        : null
    );
    if (getNumber(StorageKeys.coins, STARTING_COINS) !== merged.coins)
      restoredHistory(merged.coins, merged.syncVersion);
    storage.set(StorageKeys.coins, merged.coins);
    storage.set(StorageKeys.syncVersion, merged.syncVersion);
    setJSON(StorageKeys.completedLevels, merged.completedLevels);
    storage.set(StorageKeys.currentLevel, merged.currentLevel);
    if (merged.dailyReward) {
      setJSON(StorageKeys.dailyReward, merged.dailyReward);
    } else {
      storage.remove(StorageKeys.dailyReward);
    }
    if (merged.awardsProgress) {
      setJSON(StorageKeys.awardsProgress, merged.awardsProgress);
    }
    if (merged.inventory) {
      setJSON(StorageKeys.unlockedSkins, merged.inventory.owned);
      storage.set(StorageKeys.selectedSkin, merged.inventory.selected);
      setJSON(StorageKeys.skinSlots, merged.inventory.slots ?? {});
    }
    if (merged.monetization)
      setJSON(StorageKeys.monetization, merged.monetization);
    // Marker clears last: an interrupted restore is retried before any sync.
    storage.remove(StorageKeys.pendingAccountRestore);
    usePlayerStore.getState().hydrateFromStorage();
    setSaveReady(true);
    useAccountStore.setState({ pendingRestore: false, user });
    startSyncQueue();
    queueSync("progress");
    flush();
  } catch (error) {
    reportIssue("account.restore", error);
    useAccountStore.setState({
      error:
        "Your cloud save could not be loaded. Reconnect and retry; no save has been uploaded.",
    });
    throw error;
  } finally {
    clearTimeout(timer);
    useAccountStore.setState({ busy: false });
  }
}

export async function restoreExistingGoogleSave(): Promise<void> {
  recoverDailyClaim();
  recoverAwardClaim();
  recoverCoinTransaction();
  const previous = getCurrentUser()?.uid;
  // Block queued background writes before identity changes.
  setSaveReady(false);
  storage.set(StorageKeys.pendingAccountRestore, "switching");
  useAccountStore.setState({ pendingRestore: true, busy: true, error: null });
  try {
    const user = await signInExistingGoogleSave();
    storage.set(StorageKeys.pendingAccountRestore, user.uid);
    await finishPendingRecovery();
  } catch (error) {
    if (getCurrentUser()?.uid === previous) {
      storage.remove(StorageKeys.pendingAccountRestore);
      setSaveReady(true);
      useAccountStore.setState({
        pendingRestore: false,
        busy: false,
        error: "Account switch cancelled. Your save is unchanged.",
      });
    }
    throw error;
  }
}
