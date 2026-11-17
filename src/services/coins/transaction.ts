import { awardsProgress, type AwardsProgress } from "../awards/policy";
import { mergeLevelStars, type LevelStars } from "../levels/ratings";
import { monetization, type Monetization } from "../ads/policy";
import { getJSON, setJSON, storage, StorageKeys } from "../storage/mmkv";
import { appendCoinHistory, type CoinEntry } from "./history";
import { inventory, type Inventory } from "../shop/policy";
type Transaction = {
  entry: CoinEntry;
  versionAfter: number;
  recordHistory?: boolean;
  playReceiptId?: string;
  inventoryAfter?: Inventory;
  levelResultAfter?: {
    completedLevels: number[];
    currentLevel: number;
    stars: LevelStars;
    awards: AwardsProgress;
  };
  monetizationAfter?: Monetization;
};
function apply(value: Transaction): void {
  storage.set(StorageKeys.coins, value.entry.balance);
  storage.set(StorageKeys.syncVersion, value.versionAfter);
  if (value.inventoryAfter) {
    setJSON(StorageKeys.unlockedSkins, value.inventoryAfter.owned);
    storage.set(StorageKeys.selectedSkin, value.inventoryAfter.selected);
    setJSON(StorageKeys.skinSlots, value.inventoryAfter.slots ?? {});
  }
  if (value.monetizationAfter)
    setJSON(StorageKeys.monetization, value.monetizationAfter);
  if (value.levelResultAfter) {
    const result = value.levelResultAfter;
    setJSON(StorageKeys.completedLevels, result.completedLevels);
    storage.set(StorageKeys.currentLevel, result.currentLevel);
    setJSON(StorageKeys.levelStars, mergeLevelStars(result.stars));
    setJSON(StorageKeys.awardsProgress, awardsProgress(result.awards));
  }
  if (value.recordHistory !== false) appendCoinHistory(value.entry);
  if (value.playReceiptId) {
    storage.set(playReceiptKey(value.playReceiptId), true);
  }
  storage.remove(StorageKeys.coinTransaction);
}

function playReceiptKey(receiptId: string): string {
  return `${StorageKeys.playPurchaseReceipts}.${receiptId}`;
}

export function hasPlayCoinReceipt(receiptId: string): boolean {
  return storage.getBoolean(playReceiptKey(receiptId)) === true;
}
export function commitCoinTransaction(value: Transaction): void {
  setJSON(StorageKeys.coinTransaction, value);
  apply(value);
}
export function recoverCoinTransaction(): boolean {
  const v = getJSON<Transaction | null>(StorageKeys.coinTransaction, null);
  if (!v) return false;
  const e = v.entry;
  if (
    !e ||
    typeof e.id !== "string" ||
    typeof e.label !== "string" ||
    !Number.isSafeInteger(e.at) ||
    !Number.isSafeInteger(e.amount) ||
    !Number.isSafeInteger(e.balance) ||
    e.balance < 0 ||
    !Number.isSafeInteger(v.versionAfter) ||
    v.versionAfter < 1
  ) {
    storage.remove(StorageKeys.coinTransaction);
    return false;
  }
  apply({
    ...v,
    ...(v.monetizationAfter
      ? { monetizationAfter: monetization(v.monetizationAfter) }
      : {}),
    ...(v.inventoryAfter
      ? {
          inventoryAfter: inventory(
            v.inventoryAfter.owned,
            v.inventoryAfter.selected,
            undefined,
            v.inventoryAfter.slots
          ),
        }
      : {}),
  });
  return true;
}
