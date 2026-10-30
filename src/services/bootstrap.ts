import { reportIssue } from "./diagnostics/client";
import { recoverCoinTransaction } from "./coins/transaction";
/**
 * Startup sequence.
 *
 * Runs ALONGSIDE the first render, never before it. The game is playable
 * offline and from local state, so nothing here is allowed to gate the first
 * frame — a player on a bad network must still see the board immediately.
 *
 * Order matters:
 *   1. Sign in (usually instant; Firebase restores the session locally).
 *   2. Pull the cloud copy and merge it (the only network wait in the app).
 *   3. Re-hydrate the store, in case the merge changed the local balance.
 *   4. Start the write queue's AppState listener.
 */

import { ensureSignedIn, getCurrentUid } from "./auth/authService";
import {
  finishPendingRecovery,
  refreshAccountStatus,
} from "./auth/accountRecovery";
import {
  fetchCloudPlayerState,
  mergeCloudProgress,
  mergeCloudDaily,
  mergeCloudAwards,
  mergeCloudInventory,
  mergeCloudMonetization,
  mergePlayerState,
} from "./sync/mergeOnLaunch";
import { queueSync, startSyncQueue } from "./sync/syncQueue";
import { usePlayerStore } from "../state/playerStore";
import { recoverAwardClaim } from "./awards/ledger";
import { recoverDailyClaim } from "./coins/dailyLedger";
import { storage, StorageKeys } from "./storage/mmkv";

/**
 * How long to wait on the cloud read before giving up for this session.
 *
 * Not a correctness boundary — losing the merge just means the local balance
 * stands and the next launch tries again. It exists so an unreachable network
 * cannot leave a promise pending for the life of the process.
 */
const CLOUD_FETCH_TIMEOUT_MS = 8000;

export type BootstrapResult = {
  uid: string | null;
  merge: "local_wins" | "cloud_wins" | "no_cloud_state" | "skipped";
};

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Never rejects. A failure here degrades the app to local-only, which is a
 * fully working game — so there is nothing a caller could usefully do with an
 * error, and throwing would only risk an unhandled rejection at startup.
 */
export async function bootstrap(): Promise<BootstrapResult> {
  if (storage.getString(StorageKeys.pendingAccountDeletion))
    return { uid: null, merge: "skipped" };
  let uid: string | null = null;

  try {
    const user = await ensureSignedIn();
    uid = user.uid;
    refreshAccountStatus();
    await finishPendingRecovery();
  } catch (e) {
    reportIssue("bootstrap.auth", e);
    if (__DEV__) {
      console.warn("[bootstrap] sign-in failed:", String(e));
    }
    // Offline first launch, or Firebase misconfigured. Play locally; the next
    // launch will try again and the merge rules make catching up safe.
    return { uid: null, merge: "skipped" };
  }

  try {
    const cloud = await withTimeout(
      fetchCloudPlayerState(uid),
      CLOUD_FETCH_TIMEOUT_MS
    );
    // An explicit account switch may finish while the launch request is in flight.
    // Never apply an old UID's snapshot to the newly selected account.
    if (
      getCurrentUid() !== uid ||
      storage.getString(StorageKeys.pendingAccountDeletion) ||
      storage.getString(StorageKeys.pendingAccountRestore)
    ) {
      startSyncQueue();
      return { uid: getCurrentUid(), merge: "skipped" };
    }
    // Finish any interrupted local claim before comparing cloud coin versions.
    const repairedDaily = recoverDailyClaim();
    const repairedAward = recoverAwardClaim();
    const repairedCoins = recoverCoinTransaction();
    const outcome = mergePlayerState(cloud);
    const adEconomy = mergeCloudMonetization(cloud);
    const inventory = mergeCloudInventory(cloud, outcome === "cloud_wins");
    const progress = mergeCloudProgress(cloud);
    // Preserve the prior daily high-water mark before merging a newer receipt.
    const awards = mergeCloudAwards(cloud);
    const daily = mergeCloudDaily(cloud);

    // Both merges write straight to MMKV, so the store must re-read it or the
    // HUD and Continue button would show pre-merge state until the next change.
    if (
      outcome === "cloud_wins" ||
      progress.localChanged ||
      daily.localChanged ||
      repairedDaily ||
      repairedAward ||
      repairedCoins ||
      adEconomy.localChanged ||
      inventory.localChanged ||
      awards.localChanged
    ) {
      usePlayerStore.getState().hydrateFromStorage();
    }

    startSyncQueue();
    // This device has progress the cloud lacks — levels cleared offline, or
    // the first launch after progress sync shipped. Push it.
    if (
      progress.cloudBehind ||
      daily.cloudBehind ||
      repairedDaily ||
      repairedAward ||
      repairedCoins ||
      adEconomy.cloudBehind ||
      inventory.cloudBehind ||
      awards.cloudBehind
    ) {
      queueSync("progress");
    }
    if (__DEV__) {
      console.log(
        `[bootstrap] uid=${uid} merge=${outcome} ` +
          `progress=${progress.localChanged ? "restored" : "kept"}` +
          (progress.cloudBehind ? " (pushing to cloud)" : "")
      );
    }
    return { uid, merge: outcome };
  } catch (e) {
    reportIssue("bootstrap.cloud", e);
    if (__DEV__) {
      console.warn("[bootstrap] cloud read failed:", String(e));
    }
    startSyncQueue();
    return { uid, merge: "skipped" };
  }
}
