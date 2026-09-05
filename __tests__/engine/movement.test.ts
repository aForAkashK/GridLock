/**
 * Engine tests.
 *
 * The engine is pure TypeScript with no React and no native dependency, so it
 * is tested directly — no renderer, no mocks. This is the main reason the
 * logic/render split in ARCHITECTURE.md is worth its cost.
 */

import {
  applyMove,
  legalMoves,
  maxTravelDistance,
  wouldExit,
} from '../../src/game/engine/movement';
import { MAX_HISTORY, popHistory, pushHistory } from '../../src/game/engine/undo';
import { createInitialState, isWon } from '../../src/game/models/GameState';
import type { GameState } from '../../src/game/models/GameState';
import type { Direction, Vehicle } from '../../src/game/models/Vehicle';

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

describe('maxTravelDistance', () => {
  it('travels until blocked by another vehicle', () => {
    // (0,0) heading right, blocker sitting at (3,0): it may reach x=2 only.
    const state = board([car('a', 0, 0, 'right'), car('b', 3, 0, 'up')]);
    expect(maxTravelDistance(state, 'a')).toBe(2);
  });

  it('returns the distance needed to leave the board when the path is clear', () => {
    // From x=4 on a 6-wide board, a 1-wide car needs 2 steps to be fully off.
    const state = board([car('a', 4, 0, 'right')]);
    expect(maxTravelDistance(state, 'a')).toBe(2);
  });

  it('accounts for vehicle length when leaving the board', () => {
    // A 2-wide car at x=3 spans x=3..4 and needs 3 steps to clear a 6-wide board.
    const state = board([car('a', 3, 2, 'right', 2, 1)]);
    expect(maxTravelDistance(state, 'a')).toBe(3);
  });

  it('is zero when the very next cell is occupied', () => {
    const state = board([car('a', 0, 0, 'right'), car('b', 1, 0, 'up')]);
    expect(maxTravelDistance(state, 'a')).toBe(0);
  });

  it('handles all four directions', () => {
    expect(maxTravelDistance(board([car('a', 0, 0, 'left')]), 'a')).toBe(1);
    expect(maxTravelDistance(board([car('a', 0, 0, 'up')]), 'a')).toBe(1);
    expect(maxTravelDistance(board([car('a', 5, 5, 'right')]), 'a')).toBe(1);
    expect(maxTravelDistance(board([car('a', 5, 5, 'down')]), 'a')).toBe(1);
  });

  it('only collides on its own row or column', () => {
    // The blocker is on a different row, so it cannot obstruct.
    const state = board([car('a', 0, 0, 'right'), car('b', 3, 1, 'up')]);
    expect(maxTravelDistance(state, 'a')).toBe(6);
  });

  it('is zero for an unknown vehicle id', () => {
    expect(maxTravelDistance(board([car('a', 0, 0, 'right')]), 'nope')).toBe(0);
  });
});

describe('applyMove', () => {
  it('moves a vehicle as far as it can go', () => {
    const state = board([car('a', 0, 0, 'right'), car('b', 3, 0, 'up')]);
    const { state: next, move } = applyMove(state, 'a');

    expect(move).toEqual({ vehicleId: 'a', distance: 2, exited: false });
    expect(next.vehicles.find(v => v.id === 'a')!.x).toBe(2);
    expect(next.moveCount).toBe(1);
  });

  it('removes a vehicle that reaches the board edge', () => {
    const state = board([car('a', 4, 0, 'right'), car('b', 0, 3, 'down')]);
    const { state: next, move } = applyMove(state, 'a');

    expect(move!.exited).toBe(true);
    expect(next.vehicles.find(v => v.id === 'a')).toBeUndefined();
    expect(next.escaped).toEqual(['a']);
  });

  it('rejects a move when the adjacent cell is occupied', () => {
    const state = board([car('a', 0, 0, 'right'), car('b', 1, 0, 'up')]);
    const result = applyMove(state, 'a');

    expect(result.move).toBeNull();
    // Same reference, so callers can cheaply detect a no-op.
    expect(result.state).toBe(state);
  });

  it('never mutates the input state', () => {
    const state = board([car('a', 0, 0, 'right'), car('b', 3, 0, 'up')]);
    const before = JSON.parse(JSON.stringify(state));

    applyMove(state, 'a');

    expect(state).toEqual(before);
  });

  it('marks the level won when the last vehicle escapes', () => {
    const state = board([car('a', 4, 0, 'right')]);
    const { state: next } = applyMove(state, 'a');

    expect(next.vehicles).toHaveLength(0);
    expect(next.status).toBe('won');
    expect(isWon(next)).toBe(true);
  });

  it('is not won while any vehicle remains', () => {
    const state = board([car('a', 4, 0, 'right'), car('b', 0, 3, 'down')]);
    const { state: next } = applyMove(state, 'a');

    expect(next.status).toBe('playing');
  });

  it('unblocks another vehicle once the blocker leaves', () => {
    // 'b' blocks 'a'. Moving 'b' out first frees the whole row.
    const state = board([car('a', 0, 0, 'right'), car('b', 3, 0, 'up')]);
    expect(maxTravelDistance(state, 'a')).toBe(2);

    const { state: afterB } = applyMove(state, 'b');
    expect(afterB.vehicles.find(v => v.id === 'b')).toBeUndefined();
    expect(maxTravelDistance(afterB, 'a')).toBe(6);
  });
});

describe('wouldExit', () => {
  it('is true when the path to the edge is clear', () => {
    expect(wouldExit(board([car('a', 4, 0, 'right')]), 'a')).toBe(true);
  });

  it('is false when something blocks the path', () => {
    const state = board([car('a', 0, 0, 'right'), car('b', 3, 0, 'up')]);
    expect(wouldExit(state, 'a')).toBe(false);
  });

  it('is false for a fully blocked vehicle', () => {
    const state = board([car('a', 0, 0, 'right'), car('b', 1, 0, 'up')]);
    expect(wouldExit(state, 'a')).toBe(false);
  });
});

describe('legalMoves', () => {
  it('lists only vehicles that can actually move', () => {
    const state = board([
      car('a', 0, 0, 'right'),
      car('b', 1, 0, 'up'),
      car('c', 0, 5, 'down'),
    ]);
    // 'a' is boxed in by 'b'; the other two are free.
    expect(legalMoves(state).sort()).toEqual(['b', 'c']);
  });
});

describe('createInitialState', () => {
  it('copies vehicles so the level data is never mutated', () => {
    const level = {
      id: 1,
      gridSize: 6,
      difficulty: 'easy' as const,
      vehicles: [car('a', 0, 0, 'right')],
    };
    const state = createInitialState(level);
    state.vehicles[0].x = 99;

    expect(level.vehicles[0].x).toBe(0);
  });
});

describe('undo', () => {
  it('pops the most recent prior state', () => {
    const s0 = board([car('a', 0, 0, 'right')]);
    const s1 = board([car('a', 1, 0, 'right')]);

    const history = pushHistory(pushHistory([], s0), s1);
    const popped = popHistory(history)!;

    expect(popped.state).toBe(s1);
    expect(popped.history).toEqual([s0]);
  });

  it('returns null at the start of a level', () => {
    expect(popHistory([])).toBeNull();
  });

  it('caps history at MAX_HISTORY, dropping the oldest', () => {
    let history: GameState[] = [];
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
      history = pushHistory(history, board([car(`v${i}`, 0, 0, 'right')]));
    }

    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].vehicles[0].id).toBe('v10');
  });
});
