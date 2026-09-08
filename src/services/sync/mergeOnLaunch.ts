/**
 * Launch-time reconciliation (cloud -> local).
 *
 * Distinct from the write path, which runs continuously during play. This runs
 * exactly once per cold start and answers a single question: after a reinstall
 * or a second device, which balance is real?
 *
 * Rule: the higher syncVersion wins. A fresh install has no local version, so
 * the cloud copy always wins there — which is what makes a reinstall a restore.
 * Never max(local, cloud): that would silently reward a player for reinstalling
 * and make spend-tracking meaningless.
 */

import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { storage, StorageKeys, getNumber } from '../storage/mmkv';

export type CloudPlayerState = {
  coins: number;
  syncVersion: number;
};

export type MergeOutcome = 'local_wins' | 'cloud_wins' | 'no_cloud_state';

export function mergePlayerState(cloud: CloudPlayerState | null): MergeOutcome {
  if (!cloud) {
    return 'no_cloud_state';
  }

  const localVersion = storage.getNumber(StorageKeys.syncVersion);

  // Fresh install: nothing local at all, so the cloud copy is authoritative.
  if (localVersion === undefined) {
    storage.set(StorageKeys.coins, cloud.coins);
    storage.set(StorageKeys.syncVersion, cloud.syncVersion);
    return 'cloud_wins';
  }

  if (cloud.syncVersion > localVersion) {
    storage.set(StorageKeys.coins, cloud.coins);
    storage.set(StorageKeys.syncVersion, cloud.syncVersion);
    return 'cloud_wins';
  }

  return 'local_wins';
}

/**
 * Reads players/{uid} from Firestore.
 *
 * This is the ONE place the app waits on the network, and only during startup.
 * Callers must bound it (see `bootstrap.ts`): a slow network must delay the
 * cloud merge, never the first frame.
 */
export async function fetchCloudPlayerState(
  uid: string,
): Promise<CloudPlayerState | null> {
  const snapshot = await getDoc(doc(getFirestore(), 'players', uid));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  if (!data || typeof data.coins !== 'number') {
    // A document that exists but has no usable balance is treated as absent —
    // better to keep the local value than to overwrite it with a partial write
    // from an older client.
    return null;
  }

  return {
    coins: data.coins,
    syncVersion: typeof data.syncVersion === 'number' ? data.syncVersion : 0,
  };
}

export { getNumber };
