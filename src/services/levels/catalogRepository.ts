/** Local I/O only. Cache loss or damage falls back to the bundled campaign. */
import { CONTENT_BASE_ID, CONTENT_RULES_VERSION } from './channel';
import { storage, StorageKeys } from '../storage/mmkv';
import { parseCatalog, type LevelCatalog } from './catalog';

export const BASE_LEVEL_ID = CONTENT_BASE_ID;

export function readCachedCatalog(): LevelCatalog | null {
  try {
    const text = storage.getString(StorageKeys.levelCatalog);
    return text
      ? parseCatalog(text, BASE_LEVEL_ID, CONTENT_RULES_VERSION)
      : null;
  } catch {
    return null;
  }
}

export function persistCatalog(catalog: LevelCatalog): void {
  storage.set(StorageKeys.levelCatalog, JSON.stringify(catalog));
}
