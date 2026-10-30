const mockValues = new Map<string, unknown>();
let mockFailureAt = 0,
  mockWrites = 0;
const mockQueue = jest.fn();
function mockMutation(action: () => void) {
  mockWrites++;
  if (mockFailureAt === mockWrites) throw new Error("storage interrupted");
  action();
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
    dailyReward: "daily",
    dailyRewardJournal: "journal",
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
    const value = mockValues.get(key);
    return typeof value === "string" ? JSON.parse(value) : fallback;
  },
  setJSON: (key: string, value: unknown) =>
    mockMutation(() => mockValues.set(key, JSON.stringify(value))),
}));
import {
  claimDailyReward,
  coinService,
} from "../../src/services/coins/coinService";
const now = new Date(2026, 9, 26, 12).getTime();
describe("durable daily coin claim", () => {
  beforeEach(() => {
    mockValues.clear();
    mockQueue.mockClear();
    mockFailureAt = 0;
    mockWrites = 0;
  });
  it("awards exactly once across repeated taps and later reads", () => {
    expect(claimDailyReward(now)).toMatchObject({ claimed: true, amount: 20 });
    for (let tap = 0; tap < 30; tap++)
      expect(claimDailyReward(now + tap)).toEqual({
        claimed: false,
        reason: "already_claimed",
      });
    expect(coinService.getBalance()).toBe(120);
    expect(mockValues.get("version")).toBe(1);
    expect(mockQueue).toHaveBeenCalledTimes(1);
    expect(mockValues.has("journal")).toBe(false);
  });
  it.each([1, 2, 3, 4, 5, 6])(
    "repairs an interruption at write%d without losing or doubling coins",
    (failure) => {
      mockFailureAt = failure;
      expect(() => claimDailyReward(now)).toThrow("storage interrupted");
      mockFailureAt = 0;
      coinService.getBalance(); // Cold-start hydration repairs any durable intent.
      claimDailyReward(now);
      expect(coinService.getBalance()).toBe(120);
      expect(mockValues.get("version")).toBe(1);
      expect(JSON.parse(String(mockValues.get("daily"))).streak).toBe(1);
      expect(mockValues.has("journal")).toBe(false);
    }
  );
  it("advances consecutive claims, resets gaps and preserves existing coins", () => {
    mockValues.set("coins", 640);
    mockValues.set("version", 12);
    claimDailyReward(now);
    claimDailyReward(new Date(2026, 9, 27, 1).getTime());
    expect(coinService.getBalance()).toBe(690);
    expect(claimDailyReward(new Date(2026, 9, 29, 1).getTime())).toMatchObject({
      claimed: true,
      amount: 20,
      record: { streak: 1 },
    });
    expect(coinService.getBalance()).toBe(710);
  });
  it("does not award while another account is being restored", () => {
    mockValues.set("pending", "google-user");
    expect(claimDailyReward(now)).toEqual({
      claimed: false,
      reason: "recovery_pending",
    });
    expect(coinService.getBalance()).toBe(100);
    expect(mockWrites).toBe(0);
  });
});
