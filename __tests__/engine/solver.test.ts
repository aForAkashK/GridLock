/**
 * Solver and validator tests.
 */

import {
  serializeState,
  solve,
  HINT_NODE_BUDGET,
} from '../../src/game/engine/solver';
import { computeHint } from '../../src/game/engine/hint';
import { validateLevel } from '../../src/game/engine/levelValidator';
import { applyMove } from '../../src/game/engine/movement';
import { isWon } from '../../src/game/models/GameState';
import type { GameState } from '../../src/game/models/GameState';
import type { Direction, Vehicle } from '../../src/game/models/Vehicle';
import type { Level } from '../../src/game/models/Level';

function car(
  id: string,
  x: number,
  y: number,
  direction: Direction,
  width = 1,
  height = 1,
): Vehicle {
  return { id, type: 'car', x, y, width, height, direction, color: 'red' };
}

function board(vehicles: Vehicle[], gridSize = 6): GameState {
  return {
    levelId: 1,
    gridSize,
    vehicles,
    escaped: [],
    moveCount: 0,
    status: 'playing',
  };
}

function level(vehicles: Vehicle[], id = 99): Level {
  return { id, gridSize: 6, difficulty: 'easy', vehicles };
}

describe('serializeState', () => {
  it('is independent of vehicle array order', () => {
    const a = car('a', 0, 0, 'right');
    const b = car('b', 3, 3, 'down');
    expect(serializeState(board([a, b]))).toBe(serializeState(board([b, a])));
  });

  it('distinguishes different positions', () => {
    expect(serializeState(board([car('a', 0, 0, 'right')]))).not.toBe(
      serializeState(board([car('a', 1, 0, 'right')])),
    );
  });
});

describe('solve', () => {
  it('returns an empty solution for an already-won board', () => {
    expect(solve(board([]))).toEqual({ moves: [], nodesExplored: 0 });
  });

  it('solves a single free vehicle in one move', () => {
    expect(solve(board([car('a', 4, 0, 'right')]))?.moves).toEqual(['a']);
  });

  it('finds the SHORTEST solution, not merely a solution', () => {
    // 'a' can move once while blocked, which is a legal but wasted move.
    // The shortest route is b-then-a, so the solver must not return 3 moves.
    const state = board([car('a', 0, 2, 'right', 2, 1), car('b', 3, 2, 'up', 1, 2)]);
    const solution = solve(state)!;
    expect(solution.moves).toEqual(['b', 'a']);
  });

  it('orders a three-deep dependency chain correctly', () => {
    const state = board([
      car('a', 0, 3, 'right', 2, 1),
      car('b', 3, 2, 'up', 1, 2),
      car('c', 2, 1, 'right', 2, 1),
    ]);
    expect(solve(state)!.moves).toEqual(['c', 'b', 'a']);
  });

  it('returns a replayable solution', () => {
    const start = board([
      car('a', 0, 3, 'right', 2, 1),
      car('b', 3, 2, 'up', 1, 2),
      car('c', 2, 1, 'right', 2, 1),
    ]);
    let state = start;
    for (const id of solve(start)!.moves) {
      const result = applyMove(state, id);
      expect(result.move).not.toBeNull();
      state = result.state;
    }
    expect(isWon(state)).toBe(true);
  });

  it('returns null for an unsolvable board', () => {
    // Two cars nose to nose, each blocked by the other, forever.
    const state = board([
      car('a', 2, 2, 'right', 1, 1),
      car('b', 3, 2, 'left', 1, 1),
    ]);
    expect(solve(state)).toBeNull();
  });

  it('respects the node cap rather than searching forever', () => {
    const state = board([
      car('a', 2, 2, 'right', 1, 1),
      car('b', 3, 2, 'left', 1, 1),
    ]);
    expect(solve(state, 5)).toBeNull();
  });
});

describe('computeHint', () => {
  it('suggests the first move of the shortest solution', () => {
    const state = board([car('a', 0, 2, 'right', 2, 1), car('b', 3, 2, 'up', 1, 2)]);
    expect(computeHint(state)).toEqual({ vehicleId: 'b', movesRemaining: 2 });
  });

  it('is null when the board is unsolvable, so the UI can offer Reset', () => {
    const state = board([
      car('a', 2, 2, 'right', 1, 1),
      car('b', 3, 2, 'left', 1, 1),
    ]);
    expect(computeHint(state)).toBeNull();
  });

  it('stays correct after the player leaves the optimal path', () => {
    // Waste a move, then confirm the hint re-derives from where we actually are.
    const start = board([
      car('a', 0, 2, 'right', 2, 1),
      car('b', 3, 2, 'up', 1, 2),
    ]);
    const wandered = applyMove(start, 'a').state;
    expect(computeHint(wandered)?.vehicleId).toBe('b');
  });
});

describe('validateLevel', () => {
  it('accepts a good level and reports par', () => {
    const result = validateLevel(level([car('a', 4, 0, 'right')], 1));
    expect(result.valid).toBe(true);
    expect(result.parMoves).toBe(1);
  });

  it('rejects an out-of-bounds vehicle', () => {
    const result = validateLevel(level([car('a', 5, 0, 'right', 3, 1)]));
    expect(result.issues.map(i => i.code)).toContain('OUT_OF_BOUNDS');
  });

  it('rejects overlapping vehicles', () => {
    const result = validateLevel(
      level([car('a', 1, 1, 'right', 2, 1), car('b', 2, 1, 'up', 1, 2)]),
    );
    expect(result.issues.map(i => i.code)).toContain('OVERLAP');
  });

  it('rejects duplicate ids', () => {
    const result = validateLevel(
      level([car('a', 0, 0, 'right'), car('a', 3, 3, 'down')]),
    );
    expect(result.issues.map(i => i.code)).toContain('DUPLICATE_ID');
  });

  it('rejects an unsolvable level', () => {
    const result = validateLevel(
      level([car('a', 2, 2, 'right'), car('b', 3, 2, 'left')]),
    );
    expect(result.issues.map(i => i.code)).toContain('UNSOLVABLE');
  });

  it('rejects a trivial level outside the opening tutorial', () => {
    const result = validateLevel(level([car('a', 4, 0, 'right')], 15));
    expect(result.issues.map(i => i.code)).toContain('TRIVIAL');
  });

  it('rejects a declared par that disagrees with the solver', () => {
    const result = validateLevel({
      ...level([car('a', 4, 0, 'right')], 1),
      parMoves: 7,
    });
    expect(result.issues.map(i => i.code)).toContain('PAR_MISMATCH');
  });

  it('checks geometry before searching, so a broken board fails fast', () => {
    // An overlapping board would make any solver result meaningless.
    const result = validateLevel(
      level([car('a', 1, 1, 'right', 2, 1), car('b', 2, 1, 'up', 1, 2)]),
    );
    expect(result.parMoves).toBeUndefined();
  });

  it('keeps the hint budget below the validation budget', () => {
    expect(HINT_NODE_BUDGET).toBeLessThan(200_000);
  });
});
