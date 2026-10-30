import { LEVELS } from '../../src/game/levels';
import {
  canPlayLevel,
  continueLevel,
  visibleLevels,
} from '../../src/game/levels/progression';
const first = Array.from({ length: 50 }, (_, i) => i + 1);
describe('fifty-level chapters', () => {
  it('bundles all 100 but initially reveals only 50', () => {
    expect(LEVELS).toHaveLength(100);
    expect(visibleLevels(LEVELS, [])).toHaveLength(50);
    expect(canPlayLevel(1, LEVELS, [])).toBe(true);
    expect(canPlayLevel(2, LEVELS, [])).toBe(false);
    expect(canPlayLevel(51, LEVELS, [])).toBe(false);
  });
  it('reveals 51–100 only after every first-chapter level is complete', () => {
    expect(visibleLevels(LEVELS, first.slice(0, 49))).toHaveLength(50);
    expect(visibleLevels(LEVELS, [50])).toHaveLength(50);
    expect(visibleLevels(LEVELS, first)).toHaveLength(100);
    expect(canPlayLevel(51, LEVELS, first)).toBe(true);
    expect(canPlayLevel(52, LEVELS, first)).toBe(false);
    expect(canPlayLevel(52, LEVELS, [...first, 51])).toBe(true);
  });
  it('derives the same reveal after offline restart or cloud progress union', () => {
    const saved = JSON.parse(JSON.stringify(first));
    expect(visibleLevels(LEVELS, saved)).toHaveLength(100);
    expect(continueLevel(LEVELS, saved, 51)).toBe(51);
  });
  it('cannot bypass the reveal through a stale Continue target', () => {
    expect(continueLevel(LEVELS, [], 80)).toBe(1);
    expect(continueLevel(LEVELS, [1, 2], 80)).toBe(3);
  });
  it('keeps old levels replayable and opens later downloaded chapters in order', () => {
    const more = [...LEVELS, { ...LEVELS[99], id: 101 }];
    expect(visibleLevels(more, first)).toHaveLength(100);
    const all = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(visibleLevels(more, all)).toHaveLength(101);
    expect(canPlayLevel(1, more, all)).toBe(true);
    expect(canPlayLevel(101, more, all)).toBe(true);
  });
  it('uses the planned 6x6, 7x7 and 8x8 campaign sections', () => {
    expect(LEVELS.slice(0, 59).every((level) => level.gridSize === 6)).toBe(
      true,
    );
    expect(LEVELS.slice(59, 79).every((level) => level.gridSize === 7)).toBe(
      true,
    );
    expect(LEVELS.slice(79).every((level) => level.gridSize === 8)).toBe(true);
  });
});
