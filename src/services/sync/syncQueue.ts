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

  // Taken and cleared together: a write that fails must not silently re-queue
  // stale data behind a newer balance.
  const _write = pending;
  pending = null;

  // TODO(sync): write { coins, syncVersion, updatedAt } to players/{uid} via
  // firestore().set(..., { merge: true }). Must NOT be awaited by callers —
  // Firestore's offline persistence makes it durable-and-instant locally, then
  // it drains when the network returns.
  //
  // Until that lands, `_write` is deliberately unused rather than deleted: the
  // capture-then-clear ordering above is the part that is easy to get wrong,
  // and removing it would mean rediscovering it later.
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
