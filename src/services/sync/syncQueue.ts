/**
 * Cloud sync queue for player state.
 *
 * The whole point of this module is that nothing in the game ever waits on it.
 * Callers hand it a balance and move on within the same tick; the queue decides
 * when to actually talk to Firestore.
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

import { AppState, type AppStateStatus } from 'react-native';
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import { getCurrentUid } from '../auth/authService';
import type { CoinReason } from '../coins/types';

const IDLE_FLUSH_MS = 2000;

type PendingWrite = {
  balance: number;
  version: number;
  reason: CoinReason;
};

let pending: PendingWrite | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

/**
 * Records a balance change to be pushed to Firestore. Returns immediately.
 * Later calls overwrite earlier ones — only the newest balance matters, since
 * the balance is absolute rather than a delta.
 */
export function queueBalanceSync(
  balance: number,
  version: number,
  reason: CoinReason,
): void {
  pending = { balance, version, reason };

  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  idleTimer = setTimeout(flush, IDLE_FLUSH_MS);
}

/** Forces an immediate flush. Called on level complete and on backgrounding. */
export function flush(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (!pending) {
    return;
  }

  const uid = getCurrentUid();
  if (!uid) {
    // Sign-in has not completed yet. Leave the write queued rather than
    // dropping it — the next flush (or the idle timer) will pick it up.
    return;
  }

  // Taken and cleared together: a write that fails must not silently re-queue
  // stale data behind a newer balance.
  const write = pending;
  pending = null;

  // NOT awaited, by design (DECISIONS.md D-004). Firestore's offline
  // persistence makes this durable-and-instant locally and drains it when the
  // network returns, so the caller's tap is already fully resolved.
  //
  // `merge: true` because this document also holds fields this queue does not
  // own; a full overwrite would erase them.
  setDoc(
    doc(getFirestore(), 'players', uid),
    {
      coins: write.balance,
      syncVersion: write.version,
      lastReason: write.reason,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  ).catch(() => {
    // Deliberately swallowed. A failed sync must never surface to a player
    // mid-level, and must never block. The local balance is already correct;
    // the next mutation re-queues a write with a higher syncVersion, so a lost
    // write is self-healing rather than a divergence.
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
    if (next === 'background' || next === 'inactive') {
      flush();
    }
  };

  const sub = AppState.addEventListener('change', onChange);
  return () => {
    sub.remove();
    started = false;
  };
}
