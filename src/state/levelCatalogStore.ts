/** Reactive catalog. Contains no per-frame values and never fetches on a tap. */
import { create } from 'zustand';
import { LEVELS } from '../game/levels';
import type { Level } from '../game/models/Level';
import type { LevelCatalog } from '../services/levels/catalog';
import { readCachedCatalog } from '../services/levels/catalogRepository';

export const initialCatalog = readCachedCatalog();
export const useLevelCatalogStore = create<{ levels: Level[] }>(() => ({
  levels: [...LEVELS, ...(initialCatalog?.levels ?? [])],
}));

export function installCatalog(catalog: LevelCatalog): void {
  const previous = useLevelCatalogStore.getState().levels;
  const additions = catalog.levels.filter(
    (level) => level.id > previous[previous.length - 1].id,
  );
  if (additions.length > 0) {
    // Preserve existing Level object identities so an in-progress board cannot
    // be reloaded by a catalog notification.
    useLevelCatalogStore.setState({ levels: [...previous, ...additions] });
  }
}

export function followingLevelId(
  levels: Level[],
  id: number,
): number | undefined {
  const index = levels.findIndex((level) => level.id === id);
  return index >= 0 ? levels[index + 1]?.id : undefined;
}
