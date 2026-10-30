/**
 * Local-first coin service.
 *
 * The critical property: no coin operation ever awaits the network. MMKV is
 * written synchronously and the UI updates from it immediately; the Firestore
 * write is handed to the sync queue and forgotten. See DECISIONS.md D-004.
 */

import { storage, StorageKeys, getNumber, getJSON } from "../storage/mmkv";
import { queueSync } from "../sync/syncQueue";
import type { CoinReason, CoinService } from "./types";

import { historyId } from "./history";
import { commitCoinTransaction, recoverCoinTransaction } from "./transaction";
import { recoverAwardClaim } from "../awards/ledger";
import { STARTING_COINS } from "./economy";
import { commitDailyClaim, recoverDailyClaim } from "./dailyLedger";
import {
  dailyStatus,
  parseDailyRecord,
  type DailyRecord,
} from "../rewards/dailyPolicy";

const STARTING_BALANCE = STARTING_COINS;

const REASON_LABELS: Record<CoinReason, string> = {
  level_complete: "Level completed",
  daily_reward: "Daily reward",
  rewarded_ad: "Rewarded ad",
  achievement: "Achievement reward",
  iap: "Coin purchase",
  hint: "Hint",
  undo: "Undo",
  reset: "Restart",
  skip: "Skip level",
  skin_purchase: "Skin purchase",
  ad_free_pass: "Ad-free pass",
};
function validAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Invalid coin amount");
}
function write(balance: number, amount: number, reason: CoinReason): void {
  if (!Number.isSafeInteger(balance) || balance < 0)
    throw new Error("Invalid coin balance");
  if (!amount) return;
  const versionAfter = getNumber(StorageKeys.syncVersion, 0) + 1;
  commitCoinTransaction({
    versionAfter,
    entry: {
      id: historyId("coin"),
      at: Date.now(),
      amount,
      balance,
      label: REASON_LABELS[reason],
    },
  });
  queueSync(reason);
}

export const coinService: CoinService = {
  getBalance() {
    if (recoverDailyClaim()) {
      queueSync("daily_reward");
    }
    if (recoverAwardClaim()) {
      queueSync("achievement");
    }
    if (recoverCoinTransaction()) queueSync("progress");
    const balance = getNumber(StorageKeys.coins, STARTING_BALANCE);
    return balance;
  },

  canAfford(amount) {
    return this.getBalance() >= amount;
  },

  earn(amount, reason) {
    validAmount(amount);
    const current = this.getBalance();
    if (storage.getString(StorageKeys.pendingAccountRestore)) return current;
    const next = current + amount;
    write(next, amount, reason);
    return next;
  },

  spend(amount, reason) {
    validAmount(amount);
    const current = this.getBalance();
    if (
      storage.getString(StorageKeys.pendingAccountRestore) ||
      current < amount
    ) {
      return false;
    }
    write(current - amount, -amount, reason);
    return true;
  },
};

export type DailyClaimResult =
  | { claimed: true; amount: number; record: DailyRecord }
  | {
      claimed: false;
      reason: "already_claimed" | "clock_changed" | "recovery_pending";
    };
/** Synchronous and offline. Never award from a renderer or an async callback. */
export function claimDailyReward(now = Date.now()): DailyClaimResult {
  recoverDailyClaim();
  if (storage.getString(StorageKeys.pendingAccountRestore)) {
    return { claimed: false, reason: "recovery_pending" };
  }
  const previous = parseDailyRecord(getJSON(StorageKeys.dailyReward, null));
  const status = dailyStatus(previous, now);
  if (!status.available) {
    return {
      claimed: false,
      reason: status.clockChanged ? "clock_changed" : "already_claimed",
    };
  }
  const record = {
    lastClaimDay: status.day,
    lastClaimAt: now,
    streak: status.streak,
  };
  commitDailyClaim({
    record,
    coinsAfter: coinService.getBalance() + status.amount,
    versionAfter: getNumber(StorageKeys.syncVersion, 0) + 1,
  });
  queueSync("daily_reward");
  return { claimed: true, amount: status.amount, record };
}
