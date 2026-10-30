const mockValues = new Map<string, unknown>();
let mockFail = 0,
  mockWrites = 0;
function mockWrite(fn: () => void) {
  mockWrites++;
  if (mockWrites === mockFail) throw new Error("interrupted");
  fn();
}
jest.mock("../../src/services/storage/mmkv", () => ({
  StorageKeys: {
    coins: "coins",
    syncVersion: "version",
    skinSlots: "slots",
    fleetEquipment: "fleetEquipment",
    monetization: "monetization", coinHistory: "history",
    coinTransaction: "transaction",
    unlockedSkins: "skins",
    selectedSkin: "selected",
    pendingAccountRestore: "pending",
    dailyRewardJournal: "dailyJournal",
    dailyReward: "daily",
    awardsProgress: "awards",
    awardClaimJournal: "awardJournal",
    completedLevels: "completed",
  },
  storage: {
    getString: (key: string) => mockValues.get(key),
    getNumber: (key: string) => mockValues.get(key),
    set: (key: string, value: unknown) =>
      mockWrite(() => mockValues.set(key, value)),
    remove: (key: string) => mockWrite(() => mockValues.delete(key)),
  },
  getNumber: (key: string, fallback: number) => mockValues.get(key) ?? fallback,
  getJSON: (key: string, fallback: unknown) => {
    const raw = mockValues.get(key);
    return typeof raw === "string" ? JSON.parse(raw) : fallback;
  },
  setJSON: (key: string, value: unknown) =>
    mockWrite(() => mockValues.set(key, JSON.stringify(value))),
}));
jest.mock("../../src/services/sync/syncQueue", () => ({
  queueSync: jest.fn(),
}));
import {
  buySkin,
  equipSkin,
  readInventory,
} from "../../src/services/shop/shopService";
import { inventory, mergeInventory } from "../../src/services/shop/policy";
import {
  coinService,
  claimDailyReward,
} from "../../src/services/coins/coinService";
import { coinHistory } from "../../src/services/coins/history";
import { claimAward } from "../../src/services/awards/awardService";
import {
  mergeCloudInventory,
  mergePlayerState,
} from "../../src/services/sync/mergeOnLaunch";
jest.mock("@react-native-firebase/firestore", () => ({}));
beforeEach(() => {
  mockValues.clear();
  mockWrites = 0;
  mockFail = 0;
  mockValues.set("coins", 500);
  mockValues.set("version", 10);
});
it("buys once, keeps the original equipped, and equips only owned known skins", () => {
  expect(equipSkin("red_racer")).toBe(false);
  expect(buySkin("red_racer")).toBe("purchased");
  for (let i = 0; i < 20; i++) expect(buySkin("red_racer")).toBe("owned");
  expect(coinService.getBalance()).toBe(200);
  expect(readInventory()).toEqual({
    owned: ["default", "red_racer"],
    selected: "default",
  });
  expect(equipSkin("red_racer")).toBe(true);
  expect(readInventory().selected).toBe("red_racer");
  expect(equipSkin("default")).toBe(true);
  expect(equipSkin("unknown")).toBe(false);
  expect(coinHistory()).toHaveLength(1);
  expect(coinHistory()[0]).toMatchObject({
    amount: -300,
    balance: 200,
    label: "Purchased Red Racer",
  });
});
it.each([1, 2, 3, 4, 5, 6, 7, 8])(
  "recovers purchase interrupted at write %d with one deduction, ownership and history receipt",
  (fail) => {
    mockFail = fail;
    expect(() => buySkin("red_racer")).toThrow("interrupted");
    mockFail = 0;
    coinService.getBalance();
    buySkin("red_racer");
    expect(coinService.getBalance()).toBe(200);
    expect(readInventory().owned).toEqual(["default", "red_racer"]);
    expect(coinHistory()).toHaveLength(1);
    expect(mockValues.has("transaction")).toBe(false);
  }
);
it("rejects unknown, unaffordable and account-switch purchases without changing anything", () => {
  expect(buySkin("invented")).toBe("unknown");
  mockValues.set("coins", 299);
  expect(buySkin("red_racer")).toBe("insufficient");
  mockValues.set("pending", "switching");
  expect(buySkin("red_racer")).toBe("recovery_pending");
  expect(equipSkin("default")).toBe(false);
  expect(mockWrites).toBe(0);
});
it("records earned/spent/reward coins once and retains only the latest 200 entries", () => {
  coinService.earn(10, "level_complete");
  coinService.spend(30, "hint");
  claimDailyReward(new Date(2026, 9, 28, 12).getTime());
  mockValues.set("completed", JSON.stringify([1]));
  claimAward("first_escape");
  claimAward("first_escape");
  expect(coinHistory().map((v) => v.amount)).toEqual([10, -30, 20, 25]);
  for (let i = 0; i < 201; i++) coinService.earn(10, "level_complete");
  expect(coinHistory()).toHaveLength(200);
  expect(coinHistory().at(-1)?.balance).toBe(coinService.getBalance());
});
it.each([1, 2, 3, 4, 5])(
  "recovers ordinary coin mutation interrupted at write %d",
  (fail) => {
    mockFail = fail;
    expect(() => coinService.spend(30, "hint")).toThrow();
    mockFail = 0;
    coinService.getBalance();
    // Before intent write nothing committed; otherwise the original spend is recovered.
    expect(coinService.getBalance()).toBe(fail === 1 ? 500 : 470);
    expect(coinHistory()).toHaveLength(fail === 1 ? 0 : 1);
  }
);
it("ignores invalid amounts, preserves future ownership and falls back from invalid equipment", () => {
  expect(() => coinService.spend(-10, "hint")).toThrow();
  expect(() => coinService.earn(NaN, "level_complete")).toThrow();
  expect(
    inventory(["future_car", "red_racer", "red_racer", "!!!"], "missing")
  ).toEqual({
    owned: ["default", "future_car", "red_racer"],
    selected: "default",
  });
  expect(
    mergeInventory(
      inventory(["red_racer"], "red_racer"),
      inventory([], "default")
    ).selected
  ).toBe("red_racer");
});
it("restores cloud inventory without adding balances or losing local owned skins", () => {
  buySkin("red_racer");
  const cloud = {
    coins: 80,
    syncVersion: 20,
    inventory: inventory(["future_car"], "default"),
  };
  expect(mergePlayerState(cloud)).toBe("cloud_wins");
  expect(mergeCloudInventory(cloud, true)).toEqual({
    localChanged: true,
    cloudBehind: true,
  });
  expect(readInventory()).toEqual({
    owned: ["default", "future_car", "red_racer"],
    selected: "default",
  });
  expect(coinService.getBalance()).toBe(80);
  expect(coinHistory().at(-1)?.label).toBe("Cloud balance restored");
  expect(buySkin("red_racer")).toBe("owned");
});

it("records new earnings even if recovery reuses a previous coin version", () => {
  coinService.earn(10, "level_complete");
  mockValues.set("version", 10);
  mockValues.set("coins", 80);
  coinService.earn(10, "level_complete");
  expect(coinHistory()).toHaveLength(2);
  expect(coinHistory()[0].id).not.toBe(coinHistory()[1].id);
});

it("equips a purchased skin only in its matching colour/type slot and never spends on equip", () => {
  buySkin("red_racer");
  expect(equipSkin("red_racer", "car", "red")).toBe(true);
  expect(readInventory()).toEqual({
    owned: ["default", "red_racer"],
    selected: "red_racer",
    slots: { "car:red": "red_racer" },
  });
  expect(equipSkin("red_racer", "car", "blue")).toBe(false);
  expect(equipSkin("red_racer", "truck", "red")).toBe(false);
  expect(equipSkin("default", "car", "blue")).toBe(true);
  expect(readInventory().slots?.["car:red"]).toBe("red_racer");
  expect(equipSkin("default", "car", "red")).toBe(true);
  expect(readInventory().slots).toBeUndefined();
  expect(coinService.getBalance()).toBe(200);
  expect(coinHistory()).toHaveLength(1);
});
it.each([1, 2, 3, 4, 5, 6, 7])(
  "recovers slot selection interrupted at write %d without changing coins",
  (fail) => {
    buySkin("red_racer");
    mockWrites = 0;
    mockFail = fail;
    expect(() => equipSkin("red_racer")).toThrow();
    mockFail = 0;
    coinService.getBalance();
    equipSkin("red_racer");
    expect(readInventory().slots).toEqual({ "car:red": "red_racer" });
    expect(coinService.getBalance()).toBe(200);
    expect(coinHistory()).toHaveLength(1);
  }
);
it("migrates erroneous monochrome settings to mixed defaults while retaining purchases", () => {
  mockValues.set("skins", JSON.stringify(["default", "red_racer"]));
  mockValues.set("selected", "classic_blue");
  mockValues.set("fleetEquipment", JSON.stringify({ truck: "classic_green" }));
  expect(readInventory()).toEqual({
    owned: ["default", "red_racer"],
    selected: "default",
  });
  expect(equipSkin("classic_blue")).toBe(false);
  expect(equipSkin("red_racer")).toBe(true);
  expect(readInventory().slots).toEqual({ "car:red": "red_racer" });
});
it("restores cloud slot choices and keeps local ownership without adding coins", () => {
  buySkin("red_racer");
  const cloud = {
    coins: 80,
    syncVersion: 99,
    inventory: inventory(["red_racer"], "red_racer"),
  };
  mergePlayerState(cloud);
  mergeCloudInventory(cloud, true);
  expect(readInventory()).toEqual({
    owned: ["default", "red_racer"],
    selected: "red_racer",
    slots: { "car:red": "red_racer" },
  });
  expect(coinService.getBalance()).toBe(80);
});
it("drops invalid, mismatched and unowned slot overrides", () => {
  expect(
    inventory([], "default", undefined, { "car:red": "red_racer" }).slots
  ).toBeUndefined();
  expect(
    inventory(["red_racer"], "default", undefined, {
      "car:blue": "red_racer",
      "truck:red": "red_racer",
    }).slots
  ).toBeUndefined();
  expect(inventory(["red_racer"], "red_racer").slots).toEqual({
    "car:red": "red_racer",
  });
});
