export type LevelRating = 0 | 1 | 2 | 3;
export type LevelStars = Partial<Record<number, Exclude<LevelRating, 0>>>;

export function rateSolve(moves: number, par?: number): LevelRating {
  if (!Number.isSafeInteger(moves) || moves < 1) return 0;
  if (par === undefined || !Number.isSafeInteger(par) || par < 1) return 1;
  if (moves <= par) return 3;
  return moves === par + 1 ? 2 : 1;
}

export function mergeLevelStars(...sources: unknown[]): LevelStars {
  const merged: LevelStars = {};
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source))
      continue;
    for (const [id, stars] of Object.entries(source)) {
      const level = Number(id);
      if (
        !/^[1-9]\d{0,5}$|^1000000$/.test(id) ||
        (stars !== 1 && stars !== 2 && stars !== 3)
      )
        continue;
      if (stars > (merged[level] ?? 0)) merged[level] = stars;
    }
  }
  return merged;
}

/** Merge-only Firestore keys preserve improvements from concurrent devices. */
export function encodeLevelStarMarks(stars: LevelStars): Record<string, true> {
  return Object.fromEntries(
    Object.entries(stars).map(([id, value]) => [id + "_" + value, true])
  );
}

export function decodeLevelStarMarks(marks: unknown): LevelStars {
  if (!marks || typeof marks !== "object" || Array.isArray(marks)) return {};
  const stars: LevelStars = {};
  for (const [key, earned] of Object.entries(marks)) {
    const match = /^([1-9]\d{0,5}|1000000)_([1-3])$/.exec(key);
    if (!match || earned !== true) continue;
    const level = Number(match[1]);
    const rating = Number(match[2]) as 1 | 2 | 3;
    if (rating > (stars[level] ?? 0)) stars[level] = rating;
  }
  return stars;
}
