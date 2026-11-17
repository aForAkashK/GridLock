import { LEVELS } from "../../src/game/levels";
import { buildEndlessBatch } from "../../src/game/levels/endless";
import {
  nextBatchTarget,
  LAST_CAMPAIGN_LEVEL,
} from "../../src/game/levels/endlessPolicy";
import {
  canPlayLevel,
  continueLevel,
  visibleLevels,
} from "../../src/game/levels/progression";
import { validateLevel } from "../../src/game/engine/levelValidator";
import { layoutKey } from "../../src/game/levels/seededBoard";

const through = (id: number) =>
  Array.from({ length: id }, (_, index) => index + 1);

it.each([
  [98, 100],
  [99, 120],
  [100, 120],
  [118, 120],
  [119, 140],
  [120, 140],
  [139, 160],
  [1999, 2000],
  [2000, 2000],
])("prepares through level %i's expected batch boundary", (cleared, target) => {
  expect(nextBatchTarget(through(cleared))).toBe(target);
});

it("does not prepare a new batch across a gap in progress", () => {
  expect(nextBatchTarget([...through(98), 100, 120])).toBe(100);
});

it("builds deterministic 8×8 boards with exact par and keeps the unlock sequential", () => {
  const first = buildEndlessBatch(100);
  const second = buildEndlessBatch(120);
  const levels = [...LEVELS, ...first, ...second];
  expect(first).toEqual(buildEndlessBatch(100));
  expect(levels.slice(100).map((level) => level.id)).toEqual(
    through(140).slice(100)
  );
  expect(new Set(levels.slice(79).map(layoutKey)).size).toBe(
    levels.length - 79
  );
  for (const level of [...first, ...second]) {
    expect(level.gridSize).toBe(8);
    expect(validateLevel(level).valid).toBe(true);
  }
  expect(visibleLevels(levels, through(99))).toHaveLength(100);
  expect(visibleLevels(levels, through(100))).toHaveLength(120);
  expect(canPlayLevel(101, levels, through(99))).toBe(false);
  expect(canPlayLevel(101, levels, through(100))).toBe(true);
  expect(canPlayLevel(102, levels, through(100))).toBe(false);
  expect(visibleLevels(levels, through(119))).toHaveLength(120);
  expect(continueLevel(levels, through(120), 121)).toBe(121);
});

it("has a complete final batch at the cloud save limit", () => {
  const last = buildEndlessBatch(LAST_CAMPAIGN_LEVEL - 20);
  expect(last).toHaveLength(20);
  expect(last.at(-1)?.id).toBe(LAST_CAMPAIGN_LEVEL);
});
