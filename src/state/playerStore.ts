/**
 * Player store — coins, progress, entitlements.
 *
 * The store is a thin reactive mirror over MMKV, not a second source of truth.
 * Writes go through the services (which persist synchronously), then update
 * the store so React re-renders. Reading the balance never touches the network.
 */

import { create } from 'zustand';
import { coinService } from '../services/coins/coinService';
import type { CoinReason } from '../services/coins/types';
import { storage, StorageKeys, getNumber, getBool, getJSON, setJSON } from '../services/storage/mmkv';

type PlayerState = {
  coins: number;
  currentLevel: number;
  completedLevels: number[];
  premium: boolean;
  unlockedSkins: string[];
  selectedSkin: string;

  earn: (amount: number, reason: CoinReason) => void;
  /** False when unaffordable — callers must check before granting the item. */
  spend: (amount: number, reason: CoinReason) => boolean;
  completeLevel: (levelId: number) => void;
  setPremium: (value: boolean) => void;
  /** Re-reads MMKV after a launch merge overwrites it from the cloud. */
  hydrateFromStorage: () => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  coins: coinService.getBalance(),
  currentLevel: getNumber(StorageKeys.currentLevel, 1),
  completedLevels: getJSON<number[]>(StorageKeys.completedLevels, []),
  premium: getBool(StorageKeys.premium, false),
  unlockedSkins: getJSON<string[]>(StorageKeys.unlockedSkins, ['default']),
  selectedSkin: storage.getString(StorageKeys.selectedSkin) ?? 'default',

  earn: (amount, reason) => {
    set({ coins: coinService.earn(amount, reason) });
  },

  spend: (amount, reason) => {
    if (!coinService.spend(amount, reason)) {
      return false;
    }
    set({ coins: coinService.getBalance() });
    return true;
  },

  completeLevel: levelId => {
    const completed = get().completedLevels;
    if (completed.includes(levelId)) {
      return;
    }
    const next = [...completed, levelId];
    setJSON(StorageKeys.completedLevels, next);
    const nextLevel = Math.max(get().currentLevel, levelId + 1);
    storage.set(StorageKeys.currentLevel, nextLevel);
    set({ completedLevels: next, currentLevel: nextLevel });
  },

  setPremium: value => {
    storage.set(StorageKeys.premium, value);
    set({ premium: value });
  },

  hydrateFromStorage: () => {
    set({
      coins: coinService.getBalance(),
      currentLevel: getNumber(StorageKeys.currentLevel, 1),
      completedLevels: getJSON<number[]>(StorageKeys.completedLevels, []),
      premium: getBool(StorageKeys.premium, false),
    });
  },
}));
