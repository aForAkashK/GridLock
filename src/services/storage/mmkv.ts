/**
 * MMKV — the app's synchronous local store.
 *
 * Chosen over AsyncStorage because reads are synchronous and memory-mapped.
 * The coin balance is read during render; an async read there would mean a
 * frame where the HUD shows a stale or empty value.
 */

// MMKV v4 (Nitro) exposes a factory; `MMKV` is a type only, not a constructor.
import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'gridlock' });

export const StorageKeys = {
  coins: 'player.coins',
  /** Monotonic counter used to resolve local-vs-cloud conflicts on launch. */
  syncVersion: 'player.syncVersion',
  currentLevel: 'player.currentLevel',
  completedLevels: 'player.completedLevels',
  premium: 'player.premium',
  unlockedSkins: 'player.unlockedSkins',
  selectedSkin: 'player.selectedSkin',
  dailyRewardClaimedAt: 'player.dailyRewardClaimedAt',
  /** Set once the player has dismissed or accepted the link-account nudge. */
  saveProgressNudgeSeen: 'player.saveProgressNudgeSeen',
  soundEnabled: 'settings.soundEnabled',
  musicEnabled: 'settings.musicEnabled',
  hapticsEnabled: 'settings.hapticsEnabled',
} as const;

export function getNumber(key: string, fallback: number): number {
  return storage.getNumber(key) ?? fallback;
}

export function getBool(key: string, fallback: boolean): boolean {
  return storage.getBoolean(key) ?? fallback;
}

export function getJSON<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
