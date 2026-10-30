import { getJSON, setJSON, StorageKeys } from "../storage/mmkv";
export type CoinEntry = {
  id: string;
  at: number;
  amount: number;
  balance: number;
  label: string;
};
export const HISTORY_LIMIT = 200;
let serial = 0;
/** Independent of cloud versions, which can move backwards during account recovery. */
export function historyId(prefix: string): string {
  return `${prefix}:${Date.now()}:${++serial}:${Math.random()
    .toString(36)
    .slice(2)}`;
}
export function coinHistory(): CoinEntry[] {
  const raw = getJSON<unknown>(StorageKeys.coinHistory, []);
  return Array.isArray(raw)
    ? raw
        .filter(
          (v): v is CoinEntry =>
            !!v &&
            typeof v.id === "string" &&
            Number.isSafeInteger(v.at) &&
            Number.isSafeInteger(v.amount) &&
            Number.isSafeInteger(v.balance) &&
            v.balance >= 0 &&
            typeof v.label === "string"
        )
        .slice(-HISTORY_LIMIT)
    : [];
}
/** Insertion order is authoritative; device clock changes must not reorder spending. */
export function appendCoinHistory(entry: CoinEntry): void {
  const rows = coinHistory();
  if (rows.some((row) => row.id === entry.id)) return;
  setJSON(StorageKeys.coinHistory, [...rows, entry].slice(-HISTORY_LIMIT));
}
export function openingHistory(balance: number): void {
  if (!coinHistory().length)
    appendCoinHistory({
      id: "opening",
      at: Date.now(),
      amount: 0,
      balance,
      label: "Opening balance · history starts here",
    });
}
export function restoredHistory(balance: number, version: number): void {
  const last = coinHistory().at(-1);
  if (last?.id.startsWith(`restore:${version}:`) && last.balance === balance)
    return;
  appendCoinHistory({
    id: historyId(`restore:${version}`),
    at: Date.now(),
    amount: 0,
    balance,
    label: "Cloud balance restored",
  });
}
