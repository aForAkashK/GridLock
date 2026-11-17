import { rateSolve } from "../levels/ratings";
/** Pure bounded snapshots; unique level IDs and receipts prevent replay farming. */
import { AWARDS, awardById } from "./catalog";
export type AwardsProgress = {
  perfectLevels: number[];
  bestDailyStreak: number;
  claimedIds: string[];
};
function levelIds(value: unknown): number[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is number =>
              Number.isSafeInteger(id) && id > 0 && id <= 1000000
          )
        ),
      ]
        .sort((a, b) => a - b)
        .slice(0, 2000)
    : [];
}
export function awardsProgress(
  value: unknown,
  dailyStreak = 0
): AwardsProgress {
  const raw = (
    value && typeof value === "object" ? value : {}
  ) as Partial<AwardsProgress>;
  const validStreak = (n: unknown) =>
    Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 1000000
      ? Number(n)
      : 0;
  const receipts = Array.isArray(raw.claimedIds)
    ? [
        ...new Set(
          raw.claimedIds.filter(
            (id): id is string =>
              typeof id === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(id)
          )
        ),
      ]
    : [];
  const known = AWARDS.filter((award) => receipts.includes(award.id)).map(
    (award) => award.id
  );
  // Retain valid future receipts on older apps; they never unlock an unknown award.
  const future = receipts.filter((id) => !awardById(id)).sort();
  return {
    perfectLevels: levelIds(raw.perfectLevels),
    bestDailyStreak: Math.max(
      validStreak(raw.bestDailyStreak),
      validStreak(dailyStreak)
    ),
    claimedIds: [...known, ...future].slice(0, 256),
  };
}
export function mergeAwards(
  a: AwardsProgress,
  b: AwardsProgress
): AwardsProgress {
  return awardsProgress({
    perfectLevels: [...a.perfectLevels, ...b.perfectLevels],
    bestDailyStreak: Math.max(a.bestDailyStreak, b.bestDailyStreak),
    claimedIds: [...a.claimedIds, ...b.claimedIds],
  });
}
export function hasAwardsProgress(value: AwardsProgress): boolean {
  return (
    value.perfectLevels.length > 0 ||
    value.bestDailyStreak > 0 ||
    value.claimedIds.length > 0
  );
}
export function awardStatus(
  id: string,
  progress: AwardsProgress,
  completedLevels: number[]
) {
  const award = awardById(id);
  if (!award) return null;
  const claimed = progress.claimedIds.includes(award.id);
  const metric =
    award.metric === "completed"
      ? levelIds(completedLevels).length
      : award.metric === "perfect"
      ? progress.perfectLevels.length
      : progress.bestDailyStreak;
  const current = claimed ? Math.max(award.goal, metric) : metric;
  return {
    award,
    current: Math.min(current, award.goal),
    unlocked: claimed || current >= award.goal,
    claimed,
    claimable: !claimed && current >= award.goal,
  };
}
export function recordPerfect(
  progress: AwardsProgress,
  levelId: number,
  moves: number,
  par: number | undefined
): AwardsProgress {
  if (
    !Number.isSafeInteger(levelId) ||
    levelId < 1 ||
    levelId > 1000000 ||
    rateSolve(moves, par) !== 3
  )
    return progress;
  if (progress.perfectLevels.includes(levelId)) return progress;
  return awardsProgress({
    ...progress,
    perfectLevels: [...progress.perfectLevels, levelId],
  });
}
