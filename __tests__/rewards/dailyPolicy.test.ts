import {
  dailyAmount,
  dailyStatus,
  latestDaily,
  localDay,
  nextMidnight,
  parseDailyRecord,
} from "../../src/services/rewards/dailyPolicy";
const time = (day: number, hour = 12, minute = 0) =>
  new Date(2026, 9, day, hour, minute).getTime();
const receipt = (day: number, streak = 1) => ({
  lastClaimDay: localDay(time(day)),
  lastClaimAt: time(day),
  streak,
});

describe("daily calendar rewards", () => {
  it("starts at20 and never grants twice on the same calendar day", () => {
    expect(dailyStatus(null, time(26))).toMatchObject({
      available: true,
      streak: 1,
      amount: 20,
    });
    expect(dailyStatus(receipt(26), time(26, 23, 59))).toMatchObject({
      available: false,
      claimed: true,
      streak: 1,
    });
  });
  it("advances after midnight without requiring24 hours", () => {
    const previous = { ...receipt(26, 3), lastClaimAt: time(26, 23, 59) };
    expect(dailyStatus(previous, time(27, 0, 1))).toMatchObject({
      available: true,
      streak: 4,
      amount: 50,
    });
  });
  it("resets a missed day to Day1 instead of granting catch-up rewards", () => {
    expect(dailyStatus(receipt(24, 6), time(26))).toMatchObject({
      available: true,
      streak: 1,
      amount: 20,
    });
  });
  it("caps the reward at100 while keeping a longer streak", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 90].map(dailyAmount)).toEqual([
      20, 30, 40, 50, 60, 80, 100, 100, 100,
    ]);
    expect(dailyStatus(receipt(25, 18), time(26))).toMatchObject({
      streak: 19,
      amount: 100,
    });
  });
  it("blocks backward date and time changes and invalid timestamps", () => {
    expect(dailyStatus(receipt(27), time(26))).toMatchObject({
      available: false,
      clockChanged: true,
    });
    expect(dailyStatus(receipt(26), time(26, 11))).toMatchObject({
      available: false,
      clockChanged: true,
    });
    expect(dailyStatus(null, NaN).available).toBe(false);
    expect(dailyStatus(null, Infinity).available).toBe(false);
  });
  it("uses date arithmetic across month/year/leap and daylight-saving boundaries", () => {
    for (const [year, month, day] of [
      [2026, 11, 31],
      [2028, 1, 29],
      [2026, 2, 8],
      [2026, 10, 1],
    ]) {
      const before = new Date(year, month, day, 23, 59).getTime();
      const after = new Date(year, month, day + 1, 0, 1).getTime();
      expect(localDay(after) - localDay(before)).toBe(1);
      expect(nextMidnight(before)).toBe(
        new Date(year, month, day + 1).getTime()
      );
    }
  });
  it("rejects malformed saved receipts and merges the latest receipt without rewards", () => {
    for (const bad of [
      null,
      {},
      [],
      { ...receipt(26), streak: -1 },
      { ...receipt(26), lastClaimAt: NaN },
    ])
      expect(parseDailyRecord(bad)).toBeNull();
    const a = receipt(25, 10),
      b = receipt(26, 11);
    expect(latestDaily(a, b)).toBe(b);
    expect(latestDaily(b, a)).toBe(b);
    expect(latestDaily(null, b)).toBe(b);
  });
});

it("keeps the longer streak when two devices have a receipt for the same day", () => {
  const a = receipt(26, 6);
  const b = { ...receipt(26, 1), lastClaimAt: time(26, 14) };
  expect(latestDaily(a, b)).toEqual({ ...b, streak: 6 });
});
