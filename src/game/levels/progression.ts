/** Campaign visibility is local progress, independent of download availability. */
import type { Level } from '../models/Level';
export const CHAPTER_SIZE = 50;

export function visibleLevels(levels: Level[], completed: number[]): Level[] {
  const done = new Set(completed);
  let limit = CHAPTER_SIZE;
  const last = levels[levels.length - 1]?.id ?? 0;
  while (limit < last) {
    let complete = true;
    for (let id = limit - CHAPTER_SIZE + 1; id <= limit; id++) {
      if (!done.has(id)) {
        complete = false;
        break;
      }
    }
    if (!complete) {
      break;
    }
    limit += CHAPTER_SIZE;
  }
  return levels.filter((level) => level.id <= limit);
}

export function canPlayLevel(
  id: number,
  levels: Level[],
  completed: number[],
): boolean {
  return (
    visibleLevels(levels, completed).some((level) => level.id === id) &&
    (id === 1 || completed.includes(id - 1))
  );
}

export function continueLevel(
  levels: Level[],
  completed: number[],
  requested: number,
): number {
  const visible = visibleLevels(levels, completed);
  if (canPlayLevel(requested, levels, completed)) {
    return requested;
  }
  return (
    visible.find(
      (level) =>
        !completed.includes(level.id) &&
        canPlayLevel(level.id, levels, completed),
    )?.id ?? visible[visible.length - 1].id
  );
}
