import { getJSON, setJSON, storage, StorageKeys } from "../storage/mmkv";
import { awardById, type AwardId } from "./catalog";
import { awardsProgress, type AwardsProgress } from "./policy";
import { appendCoinHistory, type CoinEntry } from "../coins/history";
type Journal = {
  history?: CoinEntry;
  awardId: AwardId;
  progressAfter: AwardsProgress;
  coinsAfter: number;
  versionAfter: number;
};
function apply(value: Journal): void {
  storage.set(StorageKeys.coins, value.coinsAfter);
  storage.set(StorageKeys.syncVersion, value.versionAfter);
  setJSON(StorageKeys.awardsProgress, value.progressAfter);
  if (value.history) appendCoinHistory(value.history);
  storage.remove(StorageKeys.awardClaimJournal);
}
export function recoverAwardClaim(): boolean {
  const value = getJSON<Journal | null>(StorageKeys.awardClaimJournal, null);
  if (!value) return false;
  const normalized = awardsProgress(value.progressAfter);
  if (
    !awardById(value.awardId) ||
    !normalized.claimedIds.includes(value.awardId) ||
    !Number.isSafeInteger(value.coinsAfter) ||
    value.coinsAfter < 0 ||
    !Number.isSafeInteger(value.versionAfter) ||
    value.versionAfter < 1
  ) {
    storage.remove(StorageKeys.awardClaimJournal);
    return false;
  }
  apply({ ...value, progressAfter: normalized });
  return true;
}
export function commitAwardClaim(value: Journal): void {
  const award = awardById(value.awardId)!;
  const journal = {
    ...value,
    history: {
      id: `award:${value.awardId}`,
      at: Date.now(),
      amount: award.reward,
      balance: value.coinsAfter,
      label: award.title,
    },
  };
  setJSON(StorageKeys.awardClaimJournal, journal);
  apply(journal);
}
