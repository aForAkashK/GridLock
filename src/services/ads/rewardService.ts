import { coinService } from "../coins/coinService";
import { historyId } from "../coins/history";
import { commitCoinTransaction } from "../coins/transaction";
import {
  getJSON,
  getNumber,
  getBool,
  storage,
  StorageKeys,
} from "../storage/mmkv";
import { queueSync } from "../sync/syncQueue";
import {
  adStatus,
  COIN_PASSES,
  completedReward,
  monetization,
  rewardIntent,
  type RewardIntent,
  type RewardPurpose,
  type PassId,
} from "./policy";
export function readMonetization() {
  return monetization(getJSON(StorageKeys.monetization, null));
}
export function hasAdFree(now = Date.now()) {
  return (
    getBool(StorageKeys.premium, false) ||
    adStatus(readMonetization(), now).active
  );
}
export function prepareReward(purpose: RewardPurpose, now = Date.now()) {
  coinService.getBalance();
  if (storage.getString(StorageKeys.pendingAccountRestore)) return null;
  return rewardIntent(readMonetization(), purpose, historyId("ad"), now);
}
/** Called exclusively from the SDK earned-reward callback, never from closing an ad. */
export function grantCompletedReward(
  intent: RewardIntent,
  now = Date.now()
): boolean {
  const balance = coinService.getBalance();
  if (storage.getString(StorageKeys.pendingAccountRestore)) return false;
  const state = readMonetization(),
    next = completedReward(state, intent, now);
  if (!next) return false;
  commitCoinTransaction({
    versionAfter: getNumber(StorageKeys.syncVersion, 0) + 1,
    monetizationAfter: next,
    recordHistory: intent.purpose === "coins",
    entry: {
      id: intent.id,
      at: now,
      amount: intent.amount,
      balance: balance + intent.amount,
      label:
        intent.purpose === "coins" ? "Rewarded ad" : "Ad-free pass progress",
    },
  });
  queueSync("rewarded_ad");
  return true;
}
export type PassResult =
  | "purchased"
  | "already_processed"
  | "insufficient"
  | "recovery_pending"
  | "clock_changed"
  | "unknown";
export function buyAdFreePass(
  id: PassId,
  receipt: string,
  now = Date.now()
): PassResult {
  const balance = coinService.getBalance();
  if (storage.getString(StorageKeys.pendingAccountRestore))
    return "recovery_pending";
  const state = readMonetization(),
    pass = COIN_PASSES.find((p) => p.id === id);
  if (!pass || !/^[a-zA-Z0-9:_-]{1,160}$/.test(receipt)) return "unknown";
  if (state.receipts.includes(receipt)) return "already_processed";
  if (adStatus(state, now).clockChanged) return "clock_changed";
  if (balance < pass.price) return "insufficient";
  const next = {
    ...state,
    adFreeUntil: Math.max(now, state.adFreeUntil) + pass.days * 86400000,
    clockAt: now,
    receipts: [...state.receipts, receipt].slice(-128),
  };
  commitCoinTransaction({
    versionAfter: getNumber(StorageKeys.syncVersion, 0) + 1,
    monetizationAfter: next,
    entry: {
      id: receipt,
      at: now,
      amount: -pass.price,
      balance: balance - pass.price,
      label: `${pass.days}-day ad-free pass`,
    },
  });
  queueSync("ad_free_pass");
  return "purchased";
}
