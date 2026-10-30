const mockValues = new Map<string, unknown>();
jest.mock("../../src/services/auth/authService", () => ({
  ensureSignedIn: async () => ({ uid: "player" }),
  getCurrentUid: () => "player",
}));
jest.mock("../../src/services/auth/accountRecovery", () => ({
  finishPendingRecovery: async () => {},
  refreshAccountStatus: () => {},
}));
jest.mock("../../src/services/sync/syncQueue", () => ({
  queueSync: jest.fn(),
  startSyncQueue: jest.fn(),
}));
jest.mock("../../src/state/playerStore", () => ({
  usePlayerStore: { getState: () => ({ hydrateFromStorage: () => {} }) },
}));
jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: () => ({}),
  doc: () => ({}),
  getDoc: async () => ({
    exists: () => true,
    data: () => ({
      coins: 400,
      syncVersion: 10,
      completedLevels: [1],
      currentLevel: 2,
      dailyReward: {
        lastClaimDay: 20753,
        lastClaimAt: 1793096400000,
        streak: 1,
      },
      awardsProgress: {
        perfectLevels: [2],
        bestDailyStreak: 1,
        claimedIds: ["traffic_tamer"],
      },
    }),
  }),
}));
jest.mock("../../src/services/storage/mmkv", () => ({
  StorageKeys: {
    skinSlots: "slots",
    fleetEquipment: "fleetEquipment",
    monetization: "monetization",
    coinHistory: "history",
    coinTransaction: "transaction",
    unlockedSkins: "skins",
    selectedSkin: "selected",
    coins: "coins",
    syncVersion: "version",
    dailyReward: "daily",
    dailyRewardJournal: "dailyJournal",
    awardsProgress: "awards",
    awardClaimJournal: "awardJournal",
    pendingAccountDeletion: "pendingDeletion",
    pendingAccountRestore: "pending",
    completedLevels: "completed",
    currentLevel: "current",
  },
  storage: {
    getString: (key: string) => mockValues.get(key),
    getNumber: (key: string) => mockValues.get(key),
    set: (key: string, value: unknown) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  },
  getNumber: (key: string, fallback: number) => mockValues.get(key) ?? fallback,
  getJSON: (key: string, fallback: unknown) => {
    const value = mockValues.get(key);
    return typeof value === "string" ? JSON.parse(value) : fallback;
  },
  setJSON: (key: string, value: unknown) =>
    mockValues.set(key, JSON.stringify(value)),
}));
import { bootstrap } from "../../src/services/bootstrap";
import { coinService } from "../../src/services/coins/coinService";
import { claimAward } from "../../src/services/awards/awardService";
import { readAwardsProgress } from "../../src/services/awards/storage";
it("repairs before cloud merge,preserves both claim receipts and a prior daily high-water mark", async () => {
  mockValues.clear();
  mockValues.set("coins", 100);
  mockValues.set("version", 0);
  mockValues.set(
    "daily",
    JSON.stringify({
      lastClaimDay: 20752,
      lastClaimAt: 1793010000000,
      streak: 7,
    })
  );
  mockValues.set(
    "awardJournal",
    JSON.stringify({
      awardId: "first_escape",
      coinsAfter: 125,
      versionAfter: 1,
      progressAfter: {
        perfectLevels: [1],
        bestDailyStreak: 0,
        claimedIds: ["first_escape"],
      },
    })
  );
  expect((await bootstrap()).merge).toBe("cloud_wins");
  expect(mockValues.has("awardJournal")).toBe(false);
  expect(coinService.getBalance()).toBe(400);
  expect(mockValues.get("version")).toBe(10);
  expect(readAwardsProgress()).toEqual({
    perfectLevels: [1, 2],
    bestDailyStreak: 7,
    claimedIds: ["first_escape", "traffic_tamer"],
  });
  expect(claimAward("first_escape")).toEqual({
    claimed: false,
    reason: "already_claimed",
  });
  expect(claimAward("traffic_tamer")).toEqual({
    claimed: false,
    reason: "already_claimed",
  });
  expect(coinService.getBalance()).toBe(400);
  expect(JSON.parse(String(mockValues.get("daily"))).streak).toBe(1);
});

it("repairs an interrupted purchase before cloud merge so a later balance read cannot undo the restore", async () => {
  mockValues.clear();
  mockValues.set("coins", 500);
  mockValues.set("version", 0);
  mockValues.set(
    "transaction",
    JSON.stringify({
      versionAfter: 1,
      entry: {
        id: "purchase:test",
        at: 1793096400000,
        amount: -300,
        balance: 200,
        label: "Purchased Red Racer",
      },
      inventoryAfter: { owned: ["default", "red_racer"], selected: "default" },
    })
  );
  expect((await bootstrap()).merge).toBe("cloud_wins");
  expect(mockValues.has("transaction")).toBe(false);
  expect(coinService.getBalance()).toBe(400);
  expect(JSON.parse(mockValues.get("skins") as string)).toContain("red_racer");
});

it("repairs pending ad rewards before cloud balance merge and retains the reward receipt", async () => {
  mockValues.clear();
  mockValues.set("coins", 100);
  mockValues.set("version", 0);
  mockValues.set(
    "transaction",
    JSON.stringify({
      versionAfter: 1,
      entry: {
        id: "ad:pending",
        at: 1793096400000,
        amount: 10,
        balance: 110,
        label: "Rewarded ad",
      },
      monetizationAfter: {
        day: 20753,
        coinViews: 1,
        passViewsTotal: 4,
        adFreeUntil: 0,
        clockAt: 1793096400000,
        receipts: ["ad:pending"],
      },
    })
  );
  await bootstrap();
  expect(coinService.getBalance()).toBe(400);
  expect(mockValues.has("transaction")).toBe(false);
  expect(
    JSON.parse(mockValues.get("monetization") as string).receipts
  ).toContain("ad:pending");
});

it("does not restore or upload a deleted save when deletion is pending at startup", async () => {
  mockValues.clear();
  mockValues.set("coins", 123);
  mockValues.set(
    "pendingDeletion",
    JSON.stringify({ uid: "player", stage: "auth" })
  );
  expect(await bootstrap()).toEqual({ uid: null, merge: "skipped" });
  expect(mockValues.get("coins")).toBe(123);
  expect(mockValues.has("pendingDeletion")).toBe(true);
});
