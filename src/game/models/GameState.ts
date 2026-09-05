/**
 * Runtime state for a single level attempt.
 *
 * This is a plain immutable snapshot, deliberately free of React and of the
 * store. The engine takes a GameState and returns a new one; that purity is
 * what makes undo, the solver and the hint engine trivial to build and test.
 */

import type { Level } from './Level';
import type { Vehicle } from './Vehicle';

export type GameStatus = 'playing' | 'won';

export type GameState = {
  levelId: number;
  gridSize: number;
  /** Vehicles still on the board. An escaped vehicle is removed entirely. */
  vehicles: Vehicle[];
  /** Ids of vehicles that have driven off the board. */
  escaped: string[];
  moveCount: number;
  status: GameStatus;
};

export type Move = {
  vehicleId: string;
  /** Cells travelled. A vehicle that exits records the distance to the edge. */
  distance: number;
  /** True when this move drove the vehicle off the board. */
  exited: boolean;
};

export function createInitialState(level: Level): GameState {
  return {
    levelId: level.id,
    gridSize: level.gridSize,
    vehicles: level.vehicles.map(v => ({ ...v })),
    escaped: [],
    moveCount: 0,
    status: 'playing',
  };
}

/** A level is won when every vehicle has escaped. */
export function isWon(state: GameState): boolean {
  return state.vehicles.length === 0;
}

export type { Vehicle, Level };
