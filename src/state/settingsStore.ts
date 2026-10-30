/** Sound, music and haptics toggles. Persisted to MMKV on every change. */

import { create } from "zustand";
import {
  storage,
  StorageKeys,
  getBool,
  getNumber,
} from "../services/storage/mmkv";

type SettingsState = {
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  setMusicVolume: (volume: number) => void;
  hapticsEnabled: boolean;
  toggle: (key: "soundEnabled" | "musicEnabled" | "hapticsEnabled") => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  soundEnabled: getBool(StorageKeys.soundEnabled, true),
  musicEnabled: getBool(StorageKeys.musicEnabled, true),
  musicVolume: Math.min(
    1,
    Math.max(0, getNumber(StorageKeys.musicVolume, 0.28))
  ),
  setMusicVolume: (volume) => {
    if (!Number.isFinite(volume)) {
      return;
    }
    const next = Math.round(Math.min(1, Math.max(0, volume)) * 100) / 100;
    storage.set(StorageKeys.musicVolume, next);
    set({ musicVolume: next });
  },
  hapticsEnabled: getBool(StorageKeys.hapticsEnabled, true),

  toggle: (key) => {
    const next = !get()[key];
    storage.set(StorageKeys[key], next);
    set({ [key]: next } as Pick<SettingsState, typeof key>);
  },
}));
