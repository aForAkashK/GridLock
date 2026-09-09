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

import { ensureSignedIn } from './auth/authService';
import { fetchCloudPlayerState, mergePlayerState } from './sync/mergeOnLaunch';
import { startSyncQueue } from './sync/syncQueue';
import { usePlayerStore } from '../state/playerStore';

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
  merge: 'local_wins' | 'cloud_wins' | 'no_cloud_state' | 'skipped';
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Never rejects. A failure here degrades the app to local-only, which is a
 * fully working game — so there is nothing a caller could usefully do with an
 * error, and throwing would only risk an unhandled rejection at startup.
 */
export async function bootstrap(): Promise<BootstrapResult> {
  let uid: string | null = null;

  try {
    const user = await ensureSignedIn();
    uid = user.uid;
  } catch {
    // Offline first launch, or Firebase misconfigured. Play locally; the next
    // launch will try again and the merge rules make catching up safe.
    return { uid: null, merge: 'skipped' };
  }

  try {
    const cloud = await withTimeout(
      fetchCloudPlayerState(uid),
      CLOUD_FETCH_TIMEOUT_MS,
    );
    const outcome = mergePlayerState(cloud);

    // The merge writes straight to MMKV, so the store must re-read it or the
    // HUD would keep showing the pre-merge balance until the next mutation.
    if (outcome === 'cloud_wins') {
      usePlayerStore.getState().hydrateFromStorage();
    }

    startSyncQueue();
    return { uid, merge: outcome };
  } catch {
    startSyncQueue();
    return { uid, merge: 'skipped' };
  }
}
