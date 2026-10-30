const mockValues = new Map<string, unknown>();
let mockFail = 0,
  mockWrites = 0;
function mockWrite(fn: () => void) {
  mockWrites++;
  if (mockFail === mockWrites) throw new Error("interrupted");
  fn();
}
jest.mock("../../src/services/storage/mmkv", () => ({
  StorageKeys: {
    monetization: "mon",
    coins: "coins",
    syncVersion: "version",
    coinHistory: "history",
    coinTransaction: "transaction",
    dailyReward: "daily",
    dailyRewardJournal: "dailyJournal",
    awardsProgress: "awards",
    awardClaimJournal: "awardJournal",
    pendingAccountRestore: "pending",
    premium: "premium",
  },
  storage: {
    getString: (key: string) => mockValues.get(key),
    getNumber: (key: string) => mockValues.get(key),
    set: (key: string, v: unknown) => mockWrite(() => mockValues.set(key, v)),
    remove: (key: string) => mockWrite(() => mockValues.delete(key)),
  },
  getNumber: (key: string, fallback: number) => mockValues.get(key) ?? fallback,
  getBool: (key: string, fallback: boolean) => mockValues.get(key) ?? fallback,
  getJSON: (key: string, fallback: unknown) => {
    const v = mockValues.get(key);
    return typeof v === "string" ? JSON.parse(v) : fallback;
  },
  setJSON: (key: string, v: unknown) =>
    mockWrite(() => mockValues.set(key, JSON.stringify(v))),
}));
jest.mock("../../src/services/sync/syncQueue", () => ({
  queueSync: jest.fn(),
}));
import {
  buyAdFreePass,
  grantCompletedReward,
  hasAdFree,
  prepareReward,
  readMonetization,
} from "../../src/services/ads/rewardService";
import { coinService } from "../../src/services/coins/coinService";
import { coinHistory } from "../../src/services/coins/history";
import { DAY_MS } from "../../src/services/ads/policy";
const now = new Date(2026, 9, 28, 12).getTime();
beforeEach(() => {
  mockValues.clear();
  mockFail = 0;
  mockWrites = 0;
  mockValues.set("coins", 5000);
  mockValues.set("version", 1);
});
it("grants coins once and records actual ladder amounts", () => {
  const intent = prepareReward("coins", now)!;
  expect(grantCompletedReward(intent, now)).toBe(true);
  expect(grantCompletedReward(intent, now)).toBe(false);
  expect(coinService.getBalance()).toBe(5010);
  expect(coinHistory()).toHaveLength(1);
  expect(readMonetization().coinViews).toBe(1);
});
it.each([1, 2, 3, 4, 5, 6])(
  "recovers a coin reward interrupted at write %d without paying twice",
  (fail) => {
    const intent = prepareReward("coins", now)!;
    mockFail = fail;
    expect(() => grantCompletedReward(intent, now)).toThrow();
    mockFail = 0;
    coinService.getBalance();
    grantCompletedReward(intent, now);
    expect(coinService.getBalance()).toBe(5010);
    expect(coinHistory()).toHaveLength(1);
    expect(readMonetization().coinViews).toBe(1);
  }
);
it("starts the fifth-ad pass, pays no coins, and retains partial progress", () => {
  for (let i = 0; i < 5; i++) {
    const intent = prepareReward("day_pass", now)!;
    grantCompletedReward(intent, now);
    grantCompletedReward(intent, now);
  }
  expect(readMonetization().passViewsTotal).toBe(5);
  expect(readMonetization().adFreeUntil).toBe(now + DAY_MS);
  expect(hasAdFree(now)).toBe(true);
  expect(coinService.getBalance()).toBe(5000);
  expect(coinHistory()).toHaveLength(0);
});
it.each([1, 2, 3, 4, 5])(
  "recovers pass progress interrupted at write %d",
  (fail) => {
    const intent = prepareReward("day_pass", now)!;
    mockFail = fail;
    expect(() => grantCompletedReward(intent, now)).toThrow();
    mockFail = 0;
    coinService.getBalance();
    grantCompletedReward(intent, now);
    expect(readMonetization().passViewsTotal).toBe(1);
    expect(coinService.getBalance()).toBe(5000);
  }
);
it("buys seven and thirty-day coin passes once and extends an existing expiry", () => {
  expect(buyAdFreePass("week", "purchase:1", now)).toBe("purchased");
  expect(buyAdFreePass("week", "purchase:1", now)).toBe("already_processed");
  expect(buyAdFreePass("month", "purchase:2", now)).toBe("purchased");
  expect(coinService.getBalance()).toBe(1000);
  expect(readMonetization().adFreeUntil).toBe(now + 37 * DAY_MS);
  expect(coinHistory().map((v) => v.amount)).toEqual([-1000, -3000]);
});
it.each([1, 2, 3, 4, 5, 6])(
  "recovers a coin-pass purchase interrupted at write %d without charging twice",
  (fail) => {
    mockFail = fail;
    expect(() => buyAdFreePass("week", "purchase:1", now)).toThrow();
    mockFail = 0;
    coinService.getBalance();
    buyAdFreePass("week", "purchase:1", now);
    expect(coinService.getBalance()).toBe(4000);
    expect(readMonetization().adFreeUntil).toBe(now + 7 * DAY_MS);
    expect(coinHistory()).toHaveLength(1);
  }
);
it("rejects unaffordable passes, clock changes and account restore without mutations", () => {
  mockValues.set("coins", 999);
  expect(buyAdFreePass("week", "pass", now)).toBe("insufficient");
  expect(mockWrites).toBe(0);
  mockValues.set("pending", "switching");
  expect(prepareReward("coins", now)).toBeNull();
  expect(buyAdFreePass("week", "pass", now)).toBe("recovery_pending");
});
