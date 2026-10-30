import { reportIssue } from "../diagnostics/client";
import { monetization } from "../ads/policy";
import { inventory } from "../shop/policy";
import { recoverCoinTransaction } from "../coins/transaction";
/**
 * Cloud sync queue for player state.
 *
 * The whole point of this module is that nothing in the game ever waits on it.
 * Callers mark state dirty and move on within the same tick; the queue decides
 * when to actually talk to Firestore, and writes coins AND level progress.
 *
 * Flush triggers (DECISIONS.md D-004):
 *   1. App backgrounding  — the important one. Deleting an app requires leaving
 *                           it first, so this fires before deletion is possible.
 *   2. Level complete     — a natural checkpoint.
 *   3. ~2s idle           — coalesces a burst of mutations into one write.
 *
 * Residual risk, accepted: coins are lost only if the app is force-quit from
 * the app switcher without ever backgrounding AND deleted before next launch,
 * or if the device was offline at backgrounding (deleting the app destroys
 * Firestore's pending-write queue too).
 */

import { AppState, type AppStateStatus } from "react-native";
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";
import { getCurrentUid } from "../auth/authService";
import type { CoinReason } from "../coins/types";
import { recoverAwardClaim } from "../awards/ledger";
import { awardsProgress } from "../awards/policy";
import { recoverDailyClaim } from "../coins/dailyLedger";
import { parseDailyRecord } from "../rewards/dailyPolicy";
import { getJSON, storage, StorageKeys } from "../storage/mmkv";

const IDLE_FLUSH_MS = 2000;

export type SyncReason = CoinReason | "progress";

let pendingReason: SyncReason | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

/**
 * Marks player state as needing a push to Firestore. Returns immediately.
 *
 * Callers only say WHY; `flush` reads WHAT from local storage at write time.
 * Local storage is written synchronously before this is called, so the
 * snapshot is always the newest state — and a burst of changes (earn, then
 * complete a level) collapses into one write that carries all of it.
 */
export function queueSync(reason: SyncReason): void {
  if (storage.getString(StorageKeys.pendingAccountDeletion)) return;
  pendingReason = reason;

  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  idleTimer = setTimeout(flush, IDLE_FLUSH_MS);
}

/** Forces an immediate flush. Called on level complete and on backgrounding. */
export function flush(): void {
  if (storage.getString(StorageKeys.pendingAccountDeletion)) return;
  // A confirmed account switch must restore its cloud balance before any push.
  if (storage.getString(StorageKeys.pendingAccountRestore)) {
    return;
  }
  if (recoverDailyClaim()) {
    pendingReason = "daily_reward";
  }
  if (recoverAwardClaim()) {
    pendingReason = "achievement";
  }
  if (recoverCoinTransaction()) pendingReason = "progress";
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (!pendingReason) {
    return;
  }

  const uid = getCurrentUid();
  if (!uid) {
    // Sign-in has not completed yet. Leave the write queued rather than
    // dropping it — the next flush (or the idle timer) will pick it up.
    return;
  }

  const reason = pendingReason;
  pendingReason = null;

  const coins = storage.getNumber(StorageKeys.coins);
  const syncVersion = storage.getNumber(StorageKeys.syncVersion);
  const completedLevels = getJSON<number[]>(StorageKeys.completedLevels, []);
  const dailyReward = parseDailyRecord(getJSON(StorageKeys.dailyReward, null));
  const currentLevel = storage.getNumber(StorageKeys.currentLevel) ?? 1;

  // NOT awaited, by design (DECISIONS.md D-004). Firestore's offline
  // persistence makes this durable-and-instant locally and drains it when the
  // network returns, so the caller's tap is already fully resolved.
  //
  // `merge: true` because this document also holds fields this queue does not
  // own; a full overwrite would erase them. Coins and version are sent only
  // when this device has them: omitting them keeps the cloud's values, where
  // writing a default would overwrite a real balance.
  setDoc(
    doc(getFirestore(), "players", uid),
    {
      monetization: monetization(getJSON(StorageKeys.monetization, null)),
      inventory: inventory(
        getJSON(StorageKeys.unlockedSkins, []),
        storage.getString(StorageKeys.selectedSkin),
        undefined,
        getJSON(StorageKeys.skinSlots, undefined)
      ),
      completedLevels,
      currentLevel,
      ...(dailyReward ? { dailyReward } : {}),
      awardsProgress: awardsProgress(
        getJSON(StorageKeys.awardsProgress, null),
        dailyReward?.streak ?? 0
      ),
      lastReason: reason,
      updatedAt: serverTimestamp(),
      ...(coins !== undefined ? { coins } : {}),
      ...(syncVersion !== undefined ? { syncVersion } : {}),
    },
    { merge: true }
  )
    .then(() => {
      if (__DEV__) {
        console.log(
          `[sync] wrote coins=${coins} v${syncVersion} ` +
            `levels=${completedLevels.length} current=${currentLevel}`
        );
      }
    })
    .catch((e: unknown) => {
      reportIssue("sync.write", e);
      // Logged in dev only — otherwise a failing sync is invisible while testing.
      if (__DEV__) {
        console.warn("[sync] write failed:", String(e));
      }
      // Deliberately swallowed. A failed sync must never surface to a player
      // mid-level, and must never block. Local state is already correct; the
      // next change re-queues a fresh snapshot, so a lost write self-heals.
    });
}

/**
 * Installs the AppState listener. Call once from the app root.
 * Returns a teardown function.
 */
export function startSyncQueue(): () => void {
  if (started) {
    return () => {};
  }
  started = true;

  const onChange = (next: AppStateStatus) => {
    if (next === "background" || next === "inactive") {
      flush();
    }
  };

  const sub = AppState.addEventListener("change", onChange);
  return () => {
    sub.remove();
    started = false;
  };
}

/** Deletion discards unsent local snapshots; server marker rejects late writes. */
export function discardPendingSync(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  pendingReason = null;
}
