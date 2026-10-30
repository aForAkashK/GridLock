/** Pure calendar policy. Device-local dates, not rolling 24-hour windows. */
import { DAILY_REWARDS } from "../coins/economy";
export type DailyRecord = {
  lastClaimDay: number;
  lastClaimAt: number;
  streak: number;
};
export function parseDailyRecord(value: unknown): DailyRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const item = value as DailyRecord;
  if (
    !Number.isSafeInteger(item.lastClaimDay) ||
    item.lastClaimDay < 0 ||
    item.lastClaimDay > 1000000 ||
    !Number.isSafeInteger(item.lastClaimAt) ||
    item.lastClaimAt < 0 ||
    !Number.isSafeInteger(item.streak) ||
    item.streak < 1 ||
    item.streak > 1000000
  ) {
    return null;
  }
  return {
    lastClaimDay: item.lastClaimDay,
    lastClaimAt: item.lastClaimAt,
    streak: item.streak,
  };
}
export function localDay(now: number): number {
  const date = new Date(now);
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
}
export function nextMidnight(now: number): number {
  const date = new Date(now);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1
  ).getTime();
}
export function dailyAmount(streak: number): number {
  return DAILY_REWARDS[Math.min(Math.max(1, streak), DAILY_REWARDS.length) - 1];
}
export function dailyStatus(record: DailyRecord | null, now: number) {
  const day = localDay(now);
  const gap = record ? day - record.lastClaimDay : Infinity;
  const clockChanged =
    !Number.isSafeInteger(now) ||
    !Number.isFinite(day) ||
    day < 0 ||
    day > 1000000 ||
    (record !== null && (gap < 0 || now < record.lastClaimAt));
  const claimed = !clockChanged && gap === 0;
  const streak =
    claimed || clockChanged
      ? record?.streak ?? 1
      : gap === 1
      ? Math.min(record!.streak + 1, 1000000)
      : 1;
  return {
    available: !clockChanged && !claimed,
    claimed,
    clockChanged,
    streak,
    amount: dailyAmount(streak),
    day,
    resetsAt: nextMidnight(now),
  };
}
/** A later receipt prevents another award; merging receipts never adds coins. */
export function latestDaily(
  a: DailyRecord | null,
  b: DailyRecord | null
): DailyRecord | null {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  if (a.lastClaimDay !== b.lastClaimDay) {
    return a.lastClaimDay > b.lastClaimDay ? a : b;
  }
  const newer = a.lastClaimAt >= b.lastClaimAt ? a : b;
  return { ...newer, streak: Math.max(a.streak, b.streak) };
}
