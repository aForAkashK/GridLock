import { recoveredPlayer } from "../../src/services/auth/recoveryPolicy";
const local = {
  coins: 500,
  syncVersion: 99,
  completedLevels: [1, 2, 3],
  currentLevel: 4,
};
describe("existing-account recovery", () => {
  it("uses cloud coins rather than adding or preferring a larger local balance", () => {
    const cloud = {
      coins: 80,
      syncVersion: 2,
      completedLevels: [1, 2, 4],
      currentLevel: 5,
    };
    expect(recoveredPlayer(local, cloud)).toEqual({
      coins: 80,
      syncVersion: 2,
      completedLevels: [1, 2, 3, 4],
      currentLevel: 5,
    });
    expect(local.coins).toBe(500);
  });
  it("retains the local save for an account with no cloud document", () => {
    expect(recoveredPlayer(local, null)).toEqual(local);
  });
});

it("retains the latest daily receipt while adopting cloud coins without adding another award", () => {
  const localDaily = {
    lastClaimDay: 20752,
    lastClaimAt: 1793010000000,
    streak: 3,
  };
  const cloudDaily = {
    lastClaimDay: 20753,
    lastClaimAt: 1793096400000,
    streak: 4,
  };
  const deviceSave = {
    coins: 500,
    syncVersion: 12,
    completedLevels: [1],
    currentLevel: 2,
    dailyReward: localDaily,
  };
  const cloudSave = {
    coins: 80,
    syncVersion: 2,
    completedLevels: [1, 2],
    currentLevel: 3,
    dailyReward: cloudDaily,
  };
  expect(recoveredPlayer(deviceSave, cloudSave)).toMatchObject({
    coins: 80,
    dailyReward: cloudDaily,
  });
  expect(
    recoveredPlayer(
      { ...deviceSave, dailyReward: cloudDaily },
      { ...cloudSave, dailyReward: localDaily }
    )
  ).toMatchObject({ coins: 80, dailyReward: cloudDaily });
});

it("merges achievement receipts and facts while keeping the existing cloud balance", () => {
  const device = {
    ...local,
    awardsProgress: {
      perfectLevels: [1, 2],
      bestDailyStreak: 7,
      claimedIds: ["first_escape" as const],
    },
  };
  const remote = {
    coins: 80,
    syncVersion: 2,
    completedLevels: [1, 2, 4],
    currentLevel: 5,
    awardsProgress: {
      perfectLevels: [2, 3],
      bestDailyStreak: 1,
      claimedIds: ["daily_driver" as const],
    },
  };
  expect(recoveredPlayer(device, remote)).toMatchObject({
    coins: 80,
    syncVersion: 2,
    awardsProgress: {
      perfectLevels: [1, 2, 3],
      bestDailyStreak: 7,
      claimedIds: ["first_escape", "daily_driver"],
    },
  });
});

it("restores exact slot equipment without adding coins or dropping ownership", () => {
  const device = {
    coins: 500,
    syncVersion: 20,
    completedLevels: [],
    currentLevel: 1,
    inventory: {
      owned: ["default", "red_racer"],
      selected: "default" as const,
    },
  };
  const remote = {
    coins: 80,
    syncVersion: 3,
    completedLevels: [],
    currentLevel: 1,
    inventory: {
      owned: ["default", "red_racer"],
      selected: "red_racer" as const,
      slots: { "car:red": "red_racer" as const },
    },
  };
  expect(recoveredPlayer(device, remote)).toMatchObject({
    coins: 80,
    inventory: {
      owned: ["default", "red_racer"],
      selected: "red_racer",
      slots: { "car:red": "red_racer" },
    },
  });
});
