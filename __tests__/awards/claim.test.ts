const mockValues = new Map<string, unknown>();
let mockFailureAt = 0,
  mockWrites = 0;
const mockQueue = jest.fn();
function mockMutation(fn: () => void) {
  mockWrites++;
  if (mockFailureAt === mockWrites) throw new Error("interrupted");
  fn();
}
jest.mock("../../src/services/sync/syncQueue", () => ({
  queueSync: (...args: unknown[]) => mockQueue(...args),
}));
jest.mock("../../src/services/storage/mmkv", () => ({
  StorageKeys: {
    skinSlots: "slots", fleetEquipment: "fleetEquipment", monetization: "monetization", coinHistory: "history",
    coinTransaction: "transaction",
    unlockedSkins: "skins",
    selectedSkin: "selected",
    coins: "coins",
    syncVersion: "version",
    awardsProgress: "awards",
    awardClaimJournal: "awardJournal",
    dailyReward: "daily",
    dailyRewardJournal: "dailyJournal",
    completedLevels: "completed",
    pendingAccountRestore: "pending",
  },
  storage: {
    getString: (key: string) => mockValues.get(key),
    getNumber: (key: string) => mockValues.get(key),
    set: (key: string, value: unknown) =>
      mockMutation(() => mockValues.set(key, value)),
    remove: (key: string) => mockMutation(() => mockValues.delete(key)),
  },
  getNumber: (key: string, fallback: number) => mockValues.get(key) ?? fallback,
  getJSON: (key: string, fallback: unknown) => {
    const v = mockValues.get(key);
    return typeof v === "string" ? JSON.parse(v) : fallback;
  },
  setJSON: (key: string, v: unknown) =>
    mockMutation(() => mockValues.set(key, JSON.stringify(v))),
}));
import { claimAward } from "../../src/services/awards/awardService";
import {
  coinService,
  claimDailyReward,
} from "../../src/services/coins/coinService";
import {
  captureDailyStreak,
  readAwardsProgress,
  recordPerfectSolve,
} from "../../src/services/awards/storage";
import type { Level } from "../../src/game/models/Level";
import type { GameState } from "../../src/game/models/GameState";
const now = new Date(2026, 9, 28, 12).getTime();
beforeEach(() => {
  mockValues.clear();
  mockFailureAt = 0;
  mockWrites = 0;
  mockQueue.mockClear();
  mockValues.set("coins", 500);
  mockValues.set("version", 10);
  mockValues.set("completed", JSON.stringify([1]));
});
it("pays a reward once across rapid taps,reopens and later coin reads", () => {
  expect(claimAward("first_escape")).toEqual({ claimed: true, amount: 25 });
  for (let i = 0; i < 20; i++)
    expect(claimAward("first_escape")).toEqual({
      claimed: false,
      reason: "already_claimed",
    });
  expect(coinService.getBalance()).toBe(525);
  expect(mockValues.get("version")).toBe(11);
  expect(readAwardsProgress().claimedIds).toEqual(["first_escape"]);
});
it.each([1, 2, 3, 4, 5, 6])(
  "repairs an interruption at write%d without losing/doubling the award",
  (failure) => {
    mockFailureAt = failure;
    expect(() => claimAward("first_escape")).toThrow("interrupted");
    mockFailureAt = 0;
    coinService.getBalance();
    claimAward("first_escape");
    expect(coinService.getBalance()).toBe(525);
    expect(mockValues.get("version")).toBe(11);
    expect(readAwardsProgress().claimedIds).toEqual(["first_escape"]);
    expect(mockValues.has("awardJournal")).toBe(false);
  }
);
it("rejects locked,unknown and account-recovery claims without awarding coins", () => {
  expect(claimAward("road_master")).toEqual({
    claimed: false,
    reason: "locked",
  });
  expect(claimAward("fake")).toEqual({ claimed: false, reason: "unknown" });
  mockValues.set("pending", "switching");
  expect(claimAward("first_escape")).toEqual({
    claimed: false,
    reason: "recovery_pending",
  });
  expect(coinService.getBalance()).toBe(500);
  expect(mockWrites).toBe(0);
});
it("keeps the best daily streak when the next claim resets to Day1", () => {
  mockValues.set(
    "daily",
    JSON.stringify({
      lastClaimDay: Math.floor(Date.UTC(2026, 9, 25) / 86400000),
      lastClaimAt: new Date(2026, 9, 25, 12).getTime(),
      streak: 7,
    })
  );
  captureDailyStreak();
  claimDailyReward(now);
  captureDailyStreak();
  expect(readAwardsProgress().bestDailyStreak).toBe(7);
  expect(claimAward("week_champion")).toEqual({ claimed: true, amount: 100 });
  expect(coinService.getBalance()).toBe(620);
});
it("does not turn skips,unfinished boards or mismatched levels into perfects", () => {
  const level = { id: 1, parMoves: 4 } as Level;
  const win = {
    levelId: 1,
    gridSize: 6,
    status: "won",
    moveCount: 4,
    vehicles: [],
    escaped: [],
  } as GameState;
  recordPerfectSolve(level, win, true);
  recordPerfectSolve(level, { ...win, status: "playing" }, false);
  recordPerfectSolve(level, { ...win, levelId: 2 }, false);
  expect(readAwardsProgress().perfectLevels).toEqual([]);
  recordPerfectSolve(level, win, false);
  recordPerfectSolve(level, win, false);
  expect(readAwardsProgress().perfectLevels).toEqual([1]);
  expect(coinService.getBalance()).toBe(500);
});
