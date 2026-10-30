/** Durable local intent, written before the balance, makes interrupted claims idempotent. */
import { getJSON, setJSON, storage, StorageKeys } from "../storage/mmkv";
import { parseDailyRecord, type DailyRecord } from "../rewards/dailyPolicy";
import { appendCoinHistory, type CoinEntry } from "./history";
import { DAILY_REWARDS } from "./economy";
type Journal = {
  history?: CoinEntry;
  record: DailyRecord;
  coinsAfter: number;
  versionAfter: number;
};
function apply(journal: Journal): void {
  storage.set(StorageKeys.coins, journal.coinsAfter);
  storage.set(StorageKeys.syncVersion, journal.versionAfter);
  setJSON(StorageKeys.dailyReward, journal.record);
  if (journal.history) appendCoinHistory(journal.history);
  storage.remove(StorageKeys.dailyRewardJournal);
}
export function recoverDailyClaim(): boolean {
  const value = getJSON<Journal | null>(StorageKeys.dailyRewardJournal, null);
  if (!value) {
    return false;
  }
  const record = parseDailyRecord(value.record);
  if (
    !record ||
    !Number.isSafeInteger(value.coinsAfter) ||
    value.coinsAfter < 0 ||
    !Number.isSafeInteger(value.versionAfter) ||
    value.versionAfter < 1
  ) {
    storage.remove(StorageKeys.dailyRewardJournal);
    return false;
  }
  apply({ ...value, record });
  return true;
}
export function commitDailyClaim(journal: Journal): void {
  const value = {
    ...journal,
    history: {
      id: `daily:${journal.record.lastClaimDay}`,
      at: journal.record.lastClaimAt,
      amount: DAILY_REWARDS[Math.min(journal.record.streak, 7) - 1],
      balance: journal.coinsAfter,
      label: `Daily reward · Day ${journal.record.streak}`,
    },
  };
  setJSON(StorageKeys.dailyRewardJournal, value);
  apply(value);
}
