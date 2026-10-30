/**
 * Level-progress merge. Pure — no storage, no Firebase — so it is unit-tested
 * directly.
 *
 * Unlike coins, progress needs no version. The set of completed levels only
 * ever grows, so the UNION of two copies is always right whichever is newer.
 * Picking a version winner instead would let a stale copy erase levels the
 * player really cleared. `currentLevel` follows the same logic: take the max.
 */

export type Progress = { completedLevels: number[]; currentLevel: number };

export type ProgressMerge = {
  merged: Progress;
  /** Local storage needs updating: the cloud had progress this device lacked. */
  localChanged: boolean;
  /** The cloud needs updating: this device has progress the cloud lacks. */
  cloudBehind: boolean;
};

/** Positive integer level ids, deduplicated and sorted. Anything else is dropped. */
export function sanitizeLevels(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids = value.filter(
    (v): v is number => typeof v === "number" && Number.isInteger(v) && v > 0
  );
  return [...new Set(ids)].sort((a, b) => a - b);
}

function sanitizeLevel(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1
    ? value
    : 1;
}

export function mergeProgress(
  local: Progress,
  cloud: Partial<Progress> | null
): ProgressMerge {
  const localLevels = sanitizeLevels(local.completedLevels);
  const cloudLevels = sanitizeLevels(cloud?.completedLevels);
  const union = sanitizeLevels([...localLevels, ...cloudLevels]);

  const localCurrent = sanitizeLevel(local.currentLevel);
  const cloudCurrent = sanitizeLevel(cloud?.currentLevel);
  const currentLevel = Math.max(localCurrent, cloudCurrent);

  return {
    merged: { completedLevels: union, currentLevel },
    localChanged:
      union.length !== localLevels.length || currentLevel !== localCurrent,
    cloudBehind:
      union.length !== cloudLevels.length || currentLevel !== cloudCurrent,
  };
}
