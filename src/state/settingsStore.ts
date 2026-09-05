/** Sound, music and haptics toggles. Persisted to MMKV on every change. */

import { create } from 'zustand';
import { storage, StorageKeys, getBool } from '../services/storage/mmkv';

type SettingsState = {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  toggle: (key: 'soundEnabled' | 'musicEnabled' | 'hapticsEnabled') => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  soundEnabled: getBool(StorageKeys.soundEnabled, true),
  musicEnabled: getBool(StorageKeys.musicEnabled, true),
  hapticsEnabled: getBool(StorageKeys.hapticsEnabled, true),

  toggle: key => {
    const next = !get()[key];
    storage.set(StorageKeys[key], next);
    set({ [key]: next } as Pick<SettingsState, typeof key>);
  },
}));
