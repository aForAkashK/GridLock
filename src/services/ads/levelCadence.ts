import { getNumber, storage, StorageKeys } from "../storage/mmkv";
import { nextLevelAdBreak } from "./policy";

/** Synchronous local pacing only; no network, timer or currency write. */
export function levelAdBreak(adFree: boolean): boolean {
  const next = nextLevelAdBreak(
    getNumber(StorageKeys.levelAdBreaks, 0),
    adFree
  );
  storage.set(StorageKeys.levelAdBreaks, next.completed);
  return next.due;
}
