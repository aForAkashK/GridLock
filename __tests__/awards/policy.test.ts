import { AWARDS } from "../../src/services/awards/catalog";
import {
  awardsProgress,
  awardStatus,
  mergeAwards,
  recordPerfect,
} from "../../src/services/awards/policy";
const levels = (count: number) =>
  Array.from({ length: count }, (_, i) => i + 1);
it("defines exactly10 unique awards,950 total coins,with fixed initial thresholds", () => {
  expect(AWARDS).toHaveLength(10);
  expect(new Set(AWARDS.map((a) => a.id)).size).toBe(10);
  expect(AWARDS.reduce((n, a) => n + a.reward, 0)).toBe(950);
  expect(
    AWARDS.filter((a) => a.metric === "completed").map((a) => a.goal)
  ).toEqual([1, 10, 25, 50, 100]);
});
it.each(AWARDS)(
  "$id unlocks only at its goal and never pays again once claimed",
  (award) => {
    const at = (count: number, claimed = false) => {
      const p = awardsProgress({
        perfectLevels: award.metric === "perfect" ? levels(count) : [],
        bestDailyStreak: award.metric === "streak" ? count : 0,
        claimedIds: claimed ? [award.id] : [],
      });
      return awardStatus(
        award.id,
        p,
        award.metric === "completed" ? levels(count) : []
      )!;
    };
    expect(at(award.goal - 1).claimable).toBe(false);
    expect(at(award.goal).claimable).toBe(true);
    expect(at(award.goal, true)).toMatchObject({
      claimed: true,
      claimable: false,
      unlocked: true,
    });
  }
);
it("counts unique valid completions and never backfills unrecorded perfects", () => {
  expect(
    awardStatus("traffic_tamer", awardsProgress(null), [1, 1, 1, -1, NaN])
      ?.current
  ).toBe(1);
  expect(
    awardStatus("perfect_start", awardsProgress(null), levels(100))?.claimable
  ).toBe(false);
});
it("records different at-par or better solves,not repeats or invalid results", () => {
  let p = awardsProgress(null);
  p = recordPerfect(p, 1, 4, 4);
  p = recordPerfect(p, 1, 4, 4);
  p = recordPerfect(p, 2, 3, 4);
  expect(p.perfectLevels).toEqual([1, 2]);
  for (const [id, moves, par] of [
    [3, 5, 4],
    [3, 0, 4],
    [NaN, 3, 4],
    [3, 3, undefined],
  ])
    expect(recordPerfect(p, id!, moves!, par)).toBe(p);
});
it("unions receipts/perfect IDs and preserves a daily high-water mark", () => {
  const a = awardsProgress({
    perfectLevels: [1, 2],
    bestDailyStreak: 7,
    claimedIds: ["first_escape"],
  });
  const b = awardsProgress({
    perfectLevels: [2, 3],
    bestDailyStreak: 1,
    claimedIds: ["daily_driver"],
  });
  expect(mergeAwards(a, b)).toEqual({
    perfectLevels: [1, 2, 3],
    bestDailyStreak: 7,
    claimedIds: ["first_escape", "daily_driver"],
  });
  expect(mergeAwards(a, a)).toEqual(a);
});
it("sanitizes corrupt or oversized saves without inventing awards", () => {
  expect(
    awardsProgress({
      perfectLevels: [1, 1, -1, "2"],
      bestDailyStreak: -5,
      claimedIds: ["!bad", "road_master", "road_master"],
    })
  ).toEqual({
    perfectLevels: [1],
    bestDailyStreak: 0,
    claimedIds: ["road_master"],
  });
  expect(
    awardsProgress({ perfectLevels: levels(3000) }).perfectLevels
  ).toHaveLength(2000);
  expect(awardStatus("fake", awardsProgress(null), [])).toBeNull();
});

it("retains bounded future receipts during old-client merges without enabling unknown rewards", () => {
  const p = awardsProgress({ claimedIds: ["future_trophy", "first_escape"] });
  expect(mergeAwards(p, awardsProgress(null)).claimedIds).toEqual([
    "first_escape",
    "future_trophy",
  ]);
  expect(awardStatus("future_trophy", p, [])).toBeNull();
});
