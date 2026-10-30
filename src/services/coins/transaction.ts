import { monetization, type Monetization } from "../ads/policy";
import { getJSON, setJSON, storage, StorageKeys } from "../storage/mmkv";
import { appendCoinHistory, type CoinEntry } from "./history";
import { inventory, type Inventory } from "../shop/policy";
type Transaction = {
  entry: CoinEntry;
  versionAfter: number;
  recordHistory?: boolean;
  inventoryAfter?: Inventory;
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
  if (value.recordHistory !== false) appendCoinHistory(value.entry);
  storage.remove(StorageKeys.coinTransaction);
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
