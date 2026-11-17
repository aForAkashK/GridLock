import {
  readLevelStars,
  saveLevelResult,
} from "../services/levels/levelResults";
import type { LevelStars } from "../services/levels/ratings";
import { monetization, type Monetization } from "../services/ads/policy";
import type {
  EquipmentCategory,
  SkinColour,
  SkinSlots,
} from "../services/shop/policy";
import {
  buySkin,
  equipSkin,
  readInventory,
  type PurchaseResult,
} from "../services/shop/shopService";
/**
 * Player store — coins, progress, entitlements.
 *
 * The store is a thin reactive mirror over MMKV, not a second source of truth.
 * Writes go through the services (which persist synchronously), then update
 * the store so React re-renders. Reading the balance never touches the network.
 */

import {
  claimAward,
  type AwardClaimResult,
} from "../services/awards/awardService";
import {
  readAwardsProgress,
  captureDailyStreak,
} from "../services/awards/storage";
import type { Level } from "../game/models/Level";
import type { GameState } from "../game/models/GameState";
import type { AwardsProgress } from "../services/awards/policy";
import { create } from "zustand";
import {
  coinService,
  claimDailyReward,
  type DailyClaimResult,
} from "../services/coins/coinService";
import {
  parseDailyRecord,
  type DailyRecord,
} from "../services/rewards/dailyPolicy";
import type { CoinReason } from "../services/coins/types";
import {
  storage,
  StorageKeys,
  getNumber,
  getBool,
  getJSON,
  setJSON,
} from "../services/storage/mmkv";

type PlayerState = {
  coins: number;
  monetization: Monetization;
  awards: AwardsProgress;
  claimAward: (id: string) => AwardClaimResult;
  saveLevelResult: (
    level: Level,
    state: GameState,
    skipped: boolean
  ) => number | null;
  levelStars: LevelStars;
  currentLevel: number;
  completedLevels: number[];
  premium: boolean;
  unlockedSkins: string[];
  selectedSkin: string;
  equippedSkins: SkinSlots;
  buySkin: (id: string) => PurchaseResult;
  equipSkin: (
    id: string,
    category?: EquipmentCategory,
    colour?: SkinColour
  ) => boolean;
  dailyReward: DailyRecord | null;
  claimDaily: (now?: number) => DailyClaimResult;

  earn: (amount: number, reason: CoinReason) => void;
  /** False when unaffordable — callers must check before granting the item. */
  spend: (amount: number, reason: CoinReason) => boolean;
  setPremium: (value: boolean) => void;
  /** Re-reads MMKV after a launch merge overwrites it from the cloud. */
  hydrateFromStorage: () => void;

  /**
   * Testing only. Marks every level complete, or clears all progress if it is
   * already unlocked. Guarded by __DEV__ at the call site so it cannot ship.
   */
  devToggleUnlockAll: (allIds: number[]) => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  coins: coinService.getBalance(),
  monetization: monetization(getJSON(StorageKeys.monetization, null)),
  awards: readAwardsProgress(),
  claimAward: (id) => {
    const result = claimAward(id);
    set({ coins: coinService.getBalance(), awards: readAwardsProgress() });
    return result;
  },
  saveLevelResult: (level, state, skipped) => {
    const amount = saveLevelResult(level, state, skipped);
    if (amount === null) return null;
    set({
      coins: coinService.getBalance(),
      completedLevels: getJSON<number[]>(StorageKeys.completedLevels, []),
      currentLevel: getNumber(StorageKeys.currentLevel, 1),
      levelStars: readLevelStars(),
      awards: readAwardsProgress(),
    });
    return amount;
  },
  dailyReward: parseDailyRecord(getJSON(StorageKeys.dailyReward, null)),
  claimDaily: (now) => {
    captureDailyStreak();
    const result = claimDailyReward(now);
    captureDailyStreak();
    set({
      unlockedSkins: readInventory().owned,
      selectedSkin: readInventory().selected,
      equippedSkins: readInventory().slots ?? {},
      awards: readAwardsProgress(),
      coins: coinService.getBalance(),
      dailyReward: parseDailyRecord(getJSON(StorageKeys.dailyReward, null)),
    });
    return result;
  },
  currentLevel: getNumber(StorageKeys.currentLevel, 1),
  completedLevels: getJSON<number[]>(StorageKeys.completedLevels, []),
  levelStars: readLevelStars(),
  premium: getBool(StorageKeys.premium, false),
  unlockedSkins: readInventory().owned,
  selectedSkin: readInventory().selected,
  equippedSkins: readInventory().slots ?? {},
  buySkin: (id) => {
    const result = buySkin(id);
    const saved = readInventory();
    set({
      coins: coinService.getBalance(),
      unlockedSkins: saved.owned,
      selectedSkin: saved.selected,
      equippedSkins: saved.slots ?? {},
    });
    return result;
  },
  equipSkin: (id, category, colour) => {
    const result = equipSkin(id, category, colour);
    set({
      selectedSkin: readInventory().selected,
      equippedSkins: readInventory().slots ?? {},
    });
    return result;
  },

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

  setPremium: (value) => {
    storage.set(StorageKeys.premium, value);
    set({ premium: value });
  },

  devToggleUnlockAll: (allIds) => {
    // Deliberately NOT synced: this is a test shortcut, and progress merges
    // by union, so pushing it would make "unlock all" permanent in the cloud.
    const alreadyAll = get().completedLevels.length >= allIds.length;
    const next = alreadyAll ? [] : allIds;
    setJSON(StorageKeys.completedLevels, next);
    const level = alreadyAll ? 1 : allIds[allIds.length - 1];
    storage.set(StorageKeys.currentLevel, level);
    set({ completedLevels: next, currentLevel: level });
  },

  hydrateFromStorage: () => {
    set({
      coins: coinService.getBalance(),
      monetization: monetization(getJSON(StorageKeys.monetization, null)),
      unlockedSkins: readInventory().owned,
      selectedSkin: readInventory().selected,
      equippedSkins: readInventory().slots ?? {},
      awards: readAwardsProgress(),
      dailyReward: parseDailyRecord(getJSON(StorageKeys.dailyReward, null)),
      currentLevel: getNumber(StorageKeys.currentLevel, 1),
      completedLevels: getJSON<number[]>(StorageKeys.completedLevels, []),
      levelStars: readLevelStars(),
      premium: getBool(StorageKeys.premium, false),
    });
  },
}));
