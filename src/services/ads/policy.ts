import { localDay } from "../rewards/dailyPolicy";
export const COIN_AD_LADDER = [10, 15, 20, 25, 35, 50] as const;
export const NORMAL_AD_COINS = 10;
/** One opportunity every four completed real rounds; no backlog after no-fill. */
export const LEVELS_PER_INTERSTITIAL = 4;
export function nextLevelAdBreak(completed: number, adFree: boolean) {
  if (adFree) return { completed: 0, due: false };
  const count =
    Number.isSafeInteger(completed) &&
    completed >= 0 &&
    completed < LEVELS_PER_INTERSTITIAL
      ? completed
      : 0;
  const next = count + 1;
  return next === LEVELS_PER_INTERSTITIAL
    ? { completed: 0, due: true }
    : { completed: next, due: false };
}
export const DAY_PASS_ADS = 5;
export const DAY_MS = 86400000;
export const COIN_PASSES = [
  { id: "week", days: 7, price: 1000 },
  { id: "month", days: 30, price: 3000 },
] as const;
export type PassId = (typeof COIN_PASSES)[number]["id"];
export type RewardPurpose = "coins" | "day_pass";
export type Monetization = {
  day: number;
  coinViews: number;
  passViewsTotal: number;
  adFreeUntil: number;
  clockAt: number;
  receipts: string[];
};
const safe = (v: unknown, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max
    ? v
    : 0;
export function monetization(value: unknown): Monetization {
  const v =
    value && typeof value === "object" ? (value as Partial<Monetization>) : {};
  return {
    day: safe(v.day, 1000000),
    coinViews: safe(v.coinViews, 1000000),
    passViewsTotal: safe(v.passViewsTotal),
    adFreeUntil: safe(v.adFreeUntil, 8640000000000000),
    clockAt: safe(v.clockAt, 8640000000000000),
    receipts: Array.isArray(v.receipts)
      ? [
          ...new Set(
            v.receipts.filter(
              (id): id is string =>
                typeof id === "string" && /^[a-zA-Z0-9:_-]{1,160}$/.test(id)
            )
          ),
        ].slice(-128)
      : [],
  };
}
export function adStatus(state: Monetization, now: number) {
  const day = localDay(now),
    clockChanged =
      !Number.isSafeInteger(now) ||
      now < state.clockAt ||
      !Number.isFinite(day) ||
      day < state.day;
  const coinViews = day === state.day ? state.coinViews : 0;
  return {
    day,
    coinViews,
    coinReward: COIN_AD_LADDER[coinViews] ?? NORMAL_AD_COINS,
    passProgress: state.passViewsTotal % DAY_PASS_ADS,
    active: state.adFreeUntil > Math.max(now, state.clockAt),
    clockChanged,
  };
}
export type RewardIntent = {
  id: string;
  purpose: RewardPurpose;
  day: number;
  amount: number;
  startedAt: number;
};
export function rewardIntent(
  state: Monetization,
  purpose: RewardPurpose,
  id: string,
  now: number
): RewardIntent | null {
  const status = adStatus(state, now);
  if (status.clockChanged || (purpose === "day_pass" && status.active))
    return null;
  return {
    id,
    purpose,
    day: status.day,
    amount: purpose === "coins" ? status.coinReward : 0,
    startedAt: now,
  };
}
export function completedReward(
  state: Monetization,
  intent: RewardIntent,
  now: number
): Monetization | null {
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    now > 8640000000000000 ||
    !/^[a-zA-Z0-9:_-]{1,160}$/.test(intent.id) ||
    !Number.isSafeInteger(intent.startedAt) ||
    intent.startedAt < 0 ||
    !Number.isSafeInteger(intent.day) ||
    intent.day < 0 ||
    !["coins", "day_pass"].includes(intent.purpose) ||
    (intent.purpose === "coins"
      ? ![...COIN_AD_LADDER, NORMAL_AD_COINS].includes(intent.amount as 10)
      : intent.amount !== 0)
  )
    return null;
  if (
    state.receipts.includes(intent.id) ||
    now < intent.startedAt ||
    now < state.clockAt
  )
    return null;
  const next = {
    ...state,
    receipts: [...state.receipts, intent.id].slice(-128),
    clockAt: now,
  };
  if (intent.purpose === "coins") {
    if (intent.day >= state.day) {
      next.day = intent.day;
      next.coinViews = Math.min(
        1000000,
        (intent.day === state.day ? state.coinViews : 0) + 1
      );
    }
  } else {
    if (!Number.isSafeInteger(state.passViewsTotal + 1)) return null;
    next.passViewsTotal = state.passViewsTotal + 1;
    if (next.passViewsTotal % DAY_PASS_ADS === 0)
      next.adFreeUntil = Math.max(now, state.adFreeUntil) + DAY_MS;
  }
  return next;
}
export function mergeMonetization(
  a: Monetization,
  b: Monetization
): Monetization {
  return monetization({
    day: Math.max(a.day, b.day),
    coinViews:
      a.day === b.day
        ? Math.max(a.coinViews, b.coinViews)
        : a.day > b.day
        ? a.coinViews
        : b.coinViews,
    passViewsTotal: Math.max(a.passViewsTotal, b.passViewsTotal),
    adFreeUntil: Math.max(a.adFreeUntil, b.adFreeUntil),
    clockAt: Math.max(a.clockAt, b.clockAt),
    receipts: [...a.receipts, ...b.receipts],
  });
}
