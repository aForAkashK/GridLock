/**
 * Every shipped level must pass the same gate the build runs.
 *
 * This deliberately calls the real `validateLevel` rather than reimplementing
 * a search here — a test with its own copy of the logic can agree with itself
 * while both are wrong.
 */

import { validateLevel } from '../../src/game/engine/levelValidator';
import { HINT_NODE_BUDGET } from '../../src/game/engine/solver';
import { LEVELS, TOTAL_LEVELS, getLevel, nextLevelId } from '../../src/game/levels';

const cases = LEVELS.map(l => [l.id, l] as const);

describe('shipped levels', () => {
  it.each(cases)('level %i passes validation', (_id, level) => {
    const result = validateLevel(level);
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it.each(cases)('level %i declares the solver-computed par', (_id, level) => {
    const result = validateLevel(level);
    expect(level.parMoves).toBe(result.parMoves);
  });

  /**
   * The guarantee behind the hint button: a hint runs the solver from the
   * current board, so if the full search fits the budget then every hint on
   * that level does too.
   */
  it.each(cases)('level %i stays within the hint budget', (_id, level) => {
    const result = validateLevel(level);
    expect(result.nodesExplored).toBeLessThanOrEqual(HINT_NODE_BUDGET);
  });

  it('ramps difficulty monotonically enough to teach', () => {
    const pars = LEVELS.map(l => l.parMoves ?? 0);
    expect(pars[0]).toBe(1);
    // Not strictly increasing — that would make the curve feel mechanical —
    // but it must never go backwards across a five-level window.
    for (let i = 5; i < pars.length; i++) {
      expect(pars[i]).toBeGreaterThanOrEqual(pars[i - 5]);
    }
  });

  it('has unique, contiguous ids', () => {
    expect(LEVELS.map(l => l.id)).toEqual(
      Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1),
    );
  });
});

describe('level registry', () => {
  it('walks from the first level to the last', () => {
    let id: number | undefined = 1;
    const visited: number[] = [];
    while (id !== undefined) {
      visited.push(id);
      id = nextLevelId(id);
    }
    expect(visited).toHaveLength(TOTAL_LEVELS);
  });

  it('returns undefined past the final level', () => {
    expect(nextLevelId(TOTAL_LEVELS)).toBeUndefined();
  });

  it('returns undefined for an unknown level', () => {
    expect(getLevel(9999)).toBeUndefined();
  });
});
