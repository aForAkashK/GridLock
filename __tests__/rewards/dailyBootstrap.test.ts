const mockValues = new Map<string, unknown>();
const mockHydrate = jest.fn();
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
  usePlayerStore: {
    getState: () => ({ hydrateFromStorage: () => mockHydrate() }),
  },
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
    }),
  }),
}));
jest.mock("../../src/services/storage/mmkv", () => ({
  StorageKeys: { skinSlots: "slots", fleetEquipment: "fleetEquipment", monetization: "monetization", coinHistory: "history", coinTransaction: "transaction", unlockedSkins: "skins", selectedSkin: "selected",
    coins: "coins",
    syncVersion: "version",
    dailyReward: "daily",
    dailyRewardJournal: "journal",
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
import { localDay } from "../../src/services/rewards/dailyPolicy";
it("repairs a pending daily intent before a higher-version cloud merge so a later read cannot roll coins back", async () => {
  mockValues.clear();
  const now = new Date(2026, 9, 26, 12).getTime();
  mockValues.set("coins", 100);
  mockValues.set("version", 0);
  mockValues.set(
    "journal",
    JSON.stringify({
      coinsAfter: 120,
      versionAfter: 1,
      record: { lastClaimDay: localDay(now), lastClaimAt: now, streak: 1 },
    })
  );
  expect((await bootstrap()).merge).toBe("cloud_wins");
  expect(mockValues.has("journal")).toBe(false);
  expect(coinService.getBalance()).toBe(400);
  expect(mockValues.get("version")).toBe(10);
  expect(mockHydrate).toHaveBeenCalled();
});
