import { AppState } from "react-native";
import { usePlayerStore } from "../../state/playerStore";
import { getCurrentUid } from "../auth/authService";
import { isSaveReady, onSaveReady } from "../auth/saveReadiness";
import { coinService } from "../coins/coinService";
import {
  commitCoinTransaction,
  hasPlayCoinReceipt,
} from "../coins/transaction";
import { getNumber, storage, StorageKeys } from "../storage/mmkv";
import { flush, queueSync } from "../sync/syncQueue";
import {
  COIN_PACKS,
  isPlayCheckoutConfigured,
  playBilling,
  type CoinPackId,
  type PlayPurchaseResult,
  type VerifiedPlayPurchase,
} from "./coinCatalog";

let busy = false;

function canCredit(uid: string): boolean {
  return (
    isSaveReady() &&
    getCurrentUid() === uid &&
    !storage.getString(StorageKeys.pendingAccountRestore) &&
    !storage.getString(StorageKeys.pendingAccountDeletion)
  );
}

function credit(receipt: VerifiedPlayPurchase): number {
  const amount = COIN_PACKS.find(
    (pack) => pack.id === receipt.productId
  )?.amount;
  if (!amount || !/^[a-f0-9]{64}$/.test(receipt.receiptId))
    throw new Error("Invalid Play receipt.");
  const balance = coinService.getBalance(); // Recover any interrupted coin write first.
  if (hasPlayCoinReceipt(receipt.receiptId)) return 0;
  commitCoinTransaction({
    playReceiptId: receipt.receiptId,
    versionAfter: getNumber(StorageKeys.syncVersion, 0) + 1,
    entry: {
      id: `play:${receipt.receiptId}`,
      at: Date.now(),
      amount,
      balance: balance + amount,
      label: "Coin purchase",
    },
  });
  usePlayerStore.getState().hydrateFromStorage();
  queueSync("iap");
  flush();
  return amount;
}

async function fulfill(uid: string, result: PlayPurchaseResult) {
  let coins = 0;
  let needsRetry = false;
  for (const receipt of result.purchases ?? []) {
    if (!canCredit(uid)) return { coins, needsRetry: true };
    coins += credit(receipt);
    try {
      await playBilling?.consume(receipt.token);
    } catch {
      // The local credit is durable. Google Play will surface the purchase again.
      needsRetry = true;
    }
  }
  return { coins, needsRetry };
}

export async function buyCoinPack(productId: CoinPackId): Promise<string> {
  if (busy) return "A Google Play purchase is already being checked.";
  const uid = getCurrentUid();
  if (!isPlayCheckoutConfigured || !playBilling || !uid || !canCredit(uid)) {
    return "Your save is still loading. Try again in a moment.";
  }
  busy = true;
  try {
    let result = await playBilling.buy(productId, uid);
    if (result.status === "cancelled") return "";
    if (result.status === "owned") result = await playBilling.recover(uid);
    if (result.status === "pending")
      return "Payment is pending. Coins arrive when Google Play confirms it.";
    if (result.status === "invalid")
      return "The purchase could not be verified. Contact Support.";
    if (result.status !== "purchased")
      return "This purchase could not be completed. Try again.";
    const { coins, needsRetry } = await fulfill(uid, result);
    if (coins) return `${coins.toLocaleString()} coins added.`;
    if (needsRetry)
      return "Your purchase will be checked again when you return.";
    return "Your coins were already added.";
  } catch {
    return "Could not finish checking with Google Play. Try again.";
  } finally {
    busy = false;
  }
}

async function recoverOwnedPurchases(): Promise<string> {
  if (busy || !playBilling) return "";
  const uid = getCurrentUid();
  if (!uid || !canCredit(uid)) return "";
  busy = true;
  try {
    const result = await playBilling.recover(uid);
    const { coins, needsRetry } = await fulfill(uid, result);
    if (coins) return `${coins.toLocaleString()} coins added.`;
    if (needsRetry) return "Your purchase will be checked again when you return.";
    if (result.status === "pending")
      return "Payment is pending. Coins arrive when Google Play confirms it.";
    if (result.status === "invalid")
      return "The purchase could not be verified. Contact Support.";
    return "";
  } catch {
    // At the next foreground or storefront visit, Play can return the receipt again.
    return "Could not check purchases with Google Play. Try again.";
  } finally {
    busy = false;
  }
}

export function recoverCoinPurchases(): Promise<string> {
  return isPlayCheckoutConfigured ? recoverOwnedPurchases() : Promise.resolve("");
}

export function startPlayCoinRecovery(): () => void {
  if (!isPlayCheckoutConfigured) return () => {};
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") recoverCoinPurchases();
  });
  const stop = onSaveReady((ready) => {
    if (ready && AppState.currentState === "active") recoverCoinPurchases();
  });
  return () => {
    sub.remove();
    stop();
  };
}
