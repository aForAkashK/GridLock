import { create } from "zustand";
import type { AuthUser } from "../services/auth/authService";
import { storage, StorageKeys } from "../services/storage/mmkv";
export const useAccountStore = create<{
  user: AuthUser | null;
  busy: boolean;
  error: string | null;
  pendingRestore: boolean;
  pendingDeletion: boolean;
  deletionComplete: boolean;
}>(() => ({
  user: null,
  busy: false,
  error: null,
  pendingDeletion: Boolean(
    storage.getString(StorageKeys.pendingAccountDeletion)
  ),
  deletionComplete: false,
  pendingRestore: Boolean(storage.getString(StorageKeys.pendingAccountRestore)),
}));
