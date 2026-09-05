/**
 * Local-first coin service.
 *
 * The critical property: no coin operation ever awaits the network. MMKV is
 * written synchronously and the UI updates from it immediately; the Firestore
 * write is handed to the sync queue and forgotten. See DECISIONS.md D-004.
 */

import { storage, StorageKeys, getNumber } from '../storage/mmkv';
import { queueBalanceSync } from '../sync/syncQueue';
import type { CoinReason, CoinService } from './types';

const STARTING_BALANCE = 100;

function bumpVersion(): number {
  const next = getNumber(StorageKeys.syncVersion, 0) + 1;
  storage.set(StorageKeys.syncVersion, next);
  return next;
}

function write(balance: number, reason: CoinReason): void {
  storage.set(StorageKeys.coins, balance);
  const version = bumpVersion();
  // Fire-and-forget. Deliberately not awaited — see DECISIONS.md D-004.
  queueBalanceSync(balance, version, reason);
}

export const coinService: CoinService = {
  getBalance() {
    return getNumber(StorageKeys.coins, STARTING_BALANCE);
  },

  canAfford(amount) {
    return this.getBalance() >= amount;
  },

  earn(amount, reason) {
    const next = this.getBalance() + amount;
    write(next, reason);
    return next;
  },

  spend(amount, reason) {
    const current = this.getBalance();
    if (current < amount) {
      return false;
    }
    write(current - amount, reason);
    return true;
  },
};
