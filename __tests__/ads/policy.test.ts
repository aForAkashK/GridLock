import {
  adStatus,
  completedReward,
  DAY_MS,
  mergeMonetization,
  monetization,
  rewardIntent,
} from "../../src/services/ads/policy";
const now = new Date(2026, 9, 28, 12).getTime();
it("pays the agreed first-six ladder then ten without a daily cap", () => {
  let state = monetization(null);
  const amounts: number[] = [];
  for (let i = 0; i < 12; i++) {
    const intent = rewardIntent(state, "coins", `ad:${i}`, now)!;
    amounts.push(intent.amount);
    state = completedReward(state, intent, now)!;
  }
  expect(amounts).toEqual([10, 15, 20, 25, 35, 50, 10, 10, 10, 10, 10, 10]);
  expect(amounts.slice(0, 6).reduce((a, b) => a + b, 0)).toBe(155);
  expect(adStatus(state, now + DAY_MS).coinReward).toBe(10);
});
it("keeps pass progress separate and activates exactly 24h only after five completed pass ads", () => {
  let state = monetization(null);
  for (let i = 0; i < 4; i++) {
    state = completedReward(
      state,
      rewardIntent(state, "day_pass", `pass:${i}`, now)!,
      now
    )!;
    expect(state.adFreeUntil).toBe(0);
  }
  state = monetization(JSON.parse(JSON.stringify(state)));
  expect(adStatus(state, now).passProgress).toBe(4);
  state = completedReward(
    state,
    rewardIntent(state, "day_pass", "pass:5", now)!,
    now
  )!;
  expect(state.adFreeUntil).toBe(now + DAY_MS);
  expect(state.coinViews).toBe(0);
  expect(rewardIntent(state, "day_pass", "pass:6", now)).toBeNull();
  expect(rewardIntent(state, "coins", "coin:1", now)?.amount).toBe(10);
  expect(adStatus(state, now + DAY_MS).active).toBe(false);
});
it("preserves partial pass progress across midnight and uses the promised amount for an ad spanning midnight", () => {
  const late = new Date(2026, 9, 28, 23, 59, 59).getTime();
  let state = monetization(null);
  state = completedReward(
    state,
    rewardIntent(state, "day_pass", "pass", late)!,
    late
  )!;
  const intent = rewardIntent(state, "coins", "coin", late)!;
  state = completedReward(state, intent, late + 20000)!;
  expect(intent.amount).toBe(10);
  expect(adStatus(state, late + 20000).coinViews).toBe(0);
  expect(adStatus(state, late + 20000).passProgress).toBe(1);
});
it("deduplicates receipts, bounds snapshots and refuses backward-clock or invalid rewards", () => {
  const state = monetization(null),
    intent = rewardIntent(state, "coins", "ad", now)!;
  const next = completedReward(state, intent, now)!;
  expect(completedReward(next, intent, now)).toBeNull();
  expect(rewardIntent(next, "coins", "ad2", now - 1)).toBeNull();
  expect(completedReward(state, { ...intent, amount: 999 }, now)).toBeNull();
  expect(
    monetization({
      coinViews: -4,
      receipts: Array.from({ length: 200 }, (_, i) => `ad:${i}`),
    }).receipts
  ).toHaveLength(128);
});
it("merges counters, receipts and expiry without summing payouts or reviving an older ladder", () => {
  const a = monetization({
    day: 10,
    coinViews: 6,
    passViewsTotal: 4,
    adFreeUntil: 100,
    clockAt: 5,
    receipts: ["a"],
  });
  const b = monetization({
    day: 11,
    coinViews: 1,
    passViewsTotal: 5,
    adFreeUntil: 200,
    clockAt: 8,
    receipts: ["b"],
  });
  expect(mergeMonetization(a, b)).toEqual({ ...b, receipts: ["a", "b"] });
});

it("does not pay at an invalid completion time", () => {
  const state = monetization(null),
    intent = rewardIntent(state, "coins", "ad", now)!;
  expect(completedReward(state, intent, NaN)).toBeNull();
});
