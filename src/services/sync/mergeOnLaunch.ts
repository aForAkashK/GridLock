import {
  monetization,
  mergeMonetization,
  type Monetization,
} from "../ads/policy";
import { inventory, mergeInventory, type Inventory } from "../shop/policy";
import { restoredHistory } from "../coins/history";
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

import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
} from "@react-native-firebase/firestore";
import {
  storage,
  StorageKeys,
  getNumber,
  getJSON,
  setJSON,
} from "../storage/mmkv";
import {
  latestDaily,
  parseDailyRecord,
  type DailyRecord,
} from "../rewards/dailyPolicy";
import {
  awardsProgress,
  mergeAwards,
  type AwardsProgress,
} from "../awards/policy";
import { mergeProgress, sanitizeLevels } from "./mergeProgress";

export type CloudPlayerState = {
  coins: number;
  monetization?: Monetization;
  inventory?: Inventory;
  awardsProgress?: AwardsProgress;
  dailyReward?: DailyRecord;
  syncVersion: number;
  /** Absent on documents written before progress sync existed. */
  completedLevels?: number[];
  currentLevel?: number;
};

export type MergeOutcome = "local_wins" | "cloud_wins" | "no_cloud_state";

export function mergePlayerState(cloud: CloudPlayerState | null): MergeOutcome {
  if (!cloud) {
    return "no_cloud_state";
  }

  const localVersion = storage.getNumber(StorageKeys.syncVersion);

  // Fresh install: nothing local at all, so the cloud copy is authoritative.
  if (localVersion === undefined) {
    if (storage.getNumber(StorageKeys.coins) !== cloud.coins)
      restoredHistory(cloud.coins, cloud.syncVersion);
    storage.set(StorageKeys.coins, cloud.coins);
    storage.set(StorageKeys.syncVersion, cloud.syncVersion);
    return "cloud_wins";
  }

  if (cloud.syncVersion > localVersion) {
    if (storage.getNumber(StorageKeys.coins) !== cloud.coins)
      restoredHistory(cloud.coins, cloud.syncVersion);
    storage.set(StorageKeys.coins, cloud.coins);
    storage.set(StorageKeys.syncVersion, cloud.syncVersion);
    return "cloud_wins";
  }

  return "local_wins";
}

/**
 * Merges level progress by UNION — independent of which coin copy won.
 *
 * Coins need a version because they go down as well as up. Progress only goes
 * up, so combining both copies is always correct and needs no winner. Returns
 * whether local storage changed (re-hydrate the store) and whether the cloud
 * is missing progress this device has (push it).
 */
export function mergeCloudProgress(cloud: CloudPlayerState | null): {
  localChanged: boolean;
  cloudBehind: boolean;
} {
  const local = {
    completedLevels: getJSON<number[]>(StorageKeys.completedLevels, []),
    currentLevel: getNumber(StorageKeys.currentLevel, 1),
  };
  const { merged, localChanged, cloudBehind } = mergeProgress(local, cloud);
  if (localChanged) {
    setJSON(StorageKeys.completedLevels, merged.completedLevels);
    storage.set(StorageKeys.currentLevel, merged.currentLevel);
  }
  return { localChanged, cloudBehind };
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
  serverOnly = false
): Promise<CloudPlayerState | null> {
  const reference = doc(getFirestore(), "players", uid);
  const snapshot = await (serverOnly
    ? getDocFromServer(reference)
    : getDoc(reference));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  if (!data || typeof data.coins !== "number") {
    // A document that exists but has no usable balance is treated as absent —
    // better to keep the local value than to overwrite it with a partial write
    // from an older client.
    return null;
  }

  return {
    coins: data.coins,
    ...(data.monetization
      ? { monetization: monetization(data.monetization) }
      : {}),
    ...(data.inventory
      ? {
          inventory: inventory(
            data.inventory.owned,
            data.inventory.selected,
            undefined,
            data.inventory.slots
          ),
        }
      : {}),
    ...(data.awardsProgress !== undefined
      ? {
          awardsProgress: awardsProgress(
            data.awardsProgress,
            parseDailyRecord(data.dailyReward)?.streak ?? 0
          ),
        }
      : {}),
    ...(parseDailyRecord(data.dailyReward)
      ? { dailyReward: parseDailyRecord(data.dailyReward)! }
      : {}),
    syncVersion: typeof data.syncVersion === "number" ? data.syncVersion : 0,
    completedLevels: sanitizeLevels(data.completedLevels),
    currentLevel:
      typeof data.currentLevel === "number" ? data.currentLevel : undefined,
  };
}

export { getNumber };

/** Receipt merge prevents repeated daily claims after a save restore. No coins are added. */
export function mergeCloudDaily(cloud: CloudPlayerState | null): {
  localChanged: boolean;
  cloudBehind: boolean;
} {
  const local = parseDailyRecord(getJSON(StorageKeys.dailyReward, null));
  const remote = parseDailyRecord(cloud?.dailyReward);
  const merged = latestDaily(local, remote);
  const localChanged = JSON.stringify(merged) !== JSON.stringify(local);
  if (localChanged && merged) {
    setJSON(StorageKeys.dailyReward, merged);
  }
  return {
    localChanged,
    cloudBehind: !!cloud && JSON.stringify(merged) !== JSON.stringify(remote),
  };
}

/** Monotonic achievement facts and claim receipts; this never adds balances. */
export function mergeCloudAwards(cloud: CloudPlayerState | null): {
  localChanged: boolean;
  cloudBehind: boolean;
} {
  const local = awardsProgress(
    getJSON(StorageKeys.awardsProgress, null),
    parseDailyRecord(getJSON(StorageKeys.dailyReward, null))?.streak ?? 0
  );
  const remote = awardsProgress(
    cloud?.awardsProgress,
    cloud?.dailyReward?.streak ?? 0
  );
  const merged = mergeAwards(local, remote);
  const stored = awardsProgress(getJSON(StorageKeys.awardsProgress, null));
  const localChanged = JSON.stringify(stored) !== JSON.stringify(merged);
  if (localChanged) setJSON(StorageKeys.awardsProgress, merged);
  return {
    localChanged,
    cloudBehind: !!cloud && JSON.stringify(remote) !== JSON.stringify(merged),
  };
}

export function mergeCloudInventory(
  cloud: CloudPlayerState | null,
  preferRemote: boolean
) {
  const local = inventory(
    getJSON(StorageKeys.unlockedSkins, []),
    storage.getString(StorageKeys.selectedSkin),
    undefined,
    getJSON(StorageKeys.skinSlots, undefined)
  );
  const remote = inventory(
    cloud?.inventory?.owned,
    cloud?.inventory?.selected,
    undefined,
    cloud?.inventory?.slots
  );
  const merged = mergeInventory(
    local,
    remote,
    preferRemote && !!cloud?.inventory
  );
  const localChanged = JSON.stringify(local) !== JSON.stringify(merged);
  if (localChanged) {
    setJSON(StorageKeys.unlockedSkins, merged.owned);
    storage.set(StorageKeys.selectedSkin, merged.selected);
    setJSON(StorageKeys.skinSlots, merged.slots ?? {});
  }
  return {
    localChanged,
    cloudBehind: !!cloud && JSON.stringify(remote) !== JSON.stringify(merged),
  };
}

export function mergeCloudMonetization(cloud: CloudPlayerState | null) {
  const local = monetization(getJSON(StorageKeys.monetization, null)),
    remote = monetization(cloud?.monetization);
  const merged = mergeMonetization(local, remote);
  const localChanged = JSON.stringify(local) !== JSON.stringify(merged);
  if (localChanged) setJSON(StorageKeys.monetization, merged);
  return {
    localChanged,
    cloudBehind: !!cloud && JSON.stringify(remote) !== JSON.stringify(merged),
  };
}
