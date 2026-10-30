const mockValues = new Map<string, number>();
jest.mock("../../src/services/storage/mmkv", () => ({
  StorageKeys: { levelAdBreaks: "player.levelAdBreaks.v1" },
  getNumber: (key: string, fallback: number) => mockValues.get(key) ?? fallback,
  storage: { set: (key: string, value: number) => mockValues.set(key, value) },
}));
import { levelAdBreak } from "../../src/services/ads/levelCadence";
import { nextLevelAdBreak } from "../../src/services/ads/policy";
beforeEach(() => mockValues.clear());
it("persists a four-result cadence for an existing save with no pacing key", () => {
  expect([
    levelAdBreak(false),
    levelAdBreak(false),
    levelAdBreak(false),
    levelAdBreak(false),
  ]).toEqual([false, false, false, true]);
  expect(mockValues.get("player.levelAdBreaks.v1")).toBe(0);
});
it("retains progress when the cadence module is reloaded", () => {
  levelAdBreak(false);
  levelAdBreak(false);
  jest.isolateModules(() => {
    const reloaded = require("../../src/services/ads/levelCadence");
    expect(reloaded.levelAdBreak(false)).toBe(false);
    expect(reloaded.levelAdBreak(false)).toBe(true);
  });
});
it("clears old progress during an ad-free pass so expiry starts with four fresh rounds", () => {
  levelAdBreak(false);
  levelAdBreak(false);
  levelAdBreak(false);
  expect(levelAdBreak(true)).toBe(false);
  expect([
    levelAdBreak(false),
    levelAdBreak(false),
    levelAdBreak(false),
    levelAdBreak(false),
  ]).toEqual([false, false, false, true]);
});
it.each([-1, 4, 100000, NaN, Infinity, 1.5])(
  "starts safely from invalid saved progress %s",
  (value) => {
    expect(nextLevelAdBreak(value, false)).toEqual({
      completed: 1,
      due: false,
    });
  }
);
