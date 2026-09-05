/**
 * Movement resolution — the heart of the game.
 *
 * A vehicle travels as far as it can along its single permitted direction. It
 * stops when blocked, or leaves the board entirely when nothing blocks it
 * before the edge. Vehicles never move backwards and never turn.
 *
 * Movement is all-or-nothing: the player chooses WHICH vehicle, never HOW FAR.
 * That is what keeps this an ordering puzzle rather than a positioning one
 * (GAME_DESIGN.md).
 */

import type { GameState, Move } from '../models/GameState';
import { isWon } from '../models/GameState';
import { DIRECTION_VECTORS, type Vehicle } from '../models/Vehicle';
import { buildOccupancyGrid, isFullyOffBoard, isInBounds } from './collision';

export type MoveResult = {
  /** The state after the move. Referentially equal to input when illegal. */
  state: GameState;
  /** Null when the move was not legal. */
  move: Move | null;
};

function find(state: GameState, id: string): Vehicle | undefined {
  return state.vehicles.find(v => v.id === id);
}

/**
 * Whether the leading face of `v`, advanced `k` steps, hits another vehicle.
 *
 * Only the leading face needs checking: the cells behind it are ones the
 * vehicle already occupied on the previous step. Cells outside the board are
 * skipped — once past the edge there is nothing left to collide with.
 */
function leadingFaceBlocked(
  state: GameState,
  grid: Array<string | null>,
  v: Vehicle,
  dx: number,
  dy: number,
  k: number,
): boolean {
  const n = state.gridSize;

  if (dx !== 0) {
    const col = dx > 0 ? v.x + v.width - 1 + k : v.x - k;
    for (let j = 0; j < v.height; j++) {
      const row = v.y + j;
      if (!isInBounds(col, row, n)) {
        continue;
      }
      const occupant = grid[row * n + col];
      if (occupant !== null && occupant !== v.id) {
        return true;
      }
    }
    return false;
  }

  const row = dy > 0 ? v.y + v.height - 1 + k : v.y - k;
  for (let i = 0; i < v.width; i++) {
    const col = v.x + i;
    if (!isInBounds(col, row, n)) {
      continue;
    }
    const occupant = grid[row * n + col];
    if (occupant !== null && occupant !== v.id) {
      return true;
    }
  }
  return false;
}

/**
 * Travel distance for a vehicle against an ALREADY-BUILT occupancy grid.
 *
 * The grid is the expensive part — O(cells) to construct. Building it once per
 * board state and threading it through, rather than rebuilding it per vehicle,
 * is what makes the solver viable: `legalMoves` would otherwise rebuild it once
 * per vehicle, and the solver calls `legalMoves` on every node it explores.
 */
function travelWithGrid(
  state: GameState,
  v: Vehicle,
  grid: Array<string | null>,
): number {
  const { dx, dy } = DIRECTION_VECTORS[v.direction];
  const n = state.gridSize;
  // Enough steps to clear the board from any starting position.
  const limit = n + Math.max(v.width, v.height);

  let steps = 0;
  for (let k = 1; k <= limit; k++) {
    if (leadingFaceBlocked(state, grid, v, dx, dy, k)) {
      break;
    }
    steps = k;
    if (isFullyOffBoard(v, dx, dy, k, n)) {
      break;
    }
  }

  return steps;
}

/**
 * How many cells this vehicle can travel before being blocked.
 * Returns the distance needed to leave the board entirely when the path is
 * completely clear, which is the signal that the vehicle escapes.
 */
export function maxTravelDistance(state: GameState, vehicleId: string): number {
  const v = find(state, vehicleId);
  if (!v) {
    return 0;
  }
  return travelWithGrid(state, v, buildOccupancyGrid(state));
}

/**
 * True when the vehicle's path to the edge is entirely clear, meaning this
 * move removes it from the board.
 */
export function wouldExit(state: GameState, vehicleId: string): boolean {
  const v = find(state, vehicleId);
  if (!v) {
    return false;
  }
  const distance = travelWithGrid(state, v, buildOccupancyGrid(state));
  if (distance === 0) {
    return false;
  }
  const { dx, dy } = DIRECTION_VECTORS[v.direction];
  return isFullyOffBoard(v, dx, dy, distance, state.gridSize);
}

/**
 * Applies a move and returns a NEW state. Never mutates the input — undo and
 * the solver both depend on prior states staying intact.
 */
export function applyMove(state: GameState, vehicleId: string): MoveResult {
  const v = find(state, vehicleId);
  if (!v) {
    return { state, move: null };
  }

  const distance = travelWithGrid(state, v, buildOccupancyGrid(state));
  if (distance === 0) {
    // Blocked. Returning the same reference lets callers cheaply detect a
    // no-op and play the blocked feedback instead of a move.
    return { state, move: null };
  }

  const { dx, dy } = DIRECTION_VECTORS[v.direction];
  const exited = isFullyOffBoard(v, dx, dy, distance, state.gridSize);

  const vehicles = exited
    ? state.vehicles.filter(x => x.id !== vehicleId)
    : state.vehicles.map(x =>
        x.id === vehicleId
          ? { ...x, x: x.x + dx * distance, y: x.y + dy * distance }
          : x,
      );

  const next: GameState = {
    ...state,
    vehicles,
    escaped: exited ? [...state.escaped, vehicleId] : state.escaped,
    moveCount: state.moveCount + 1,
    status: 'playing',
  };

  return {
    state: { ...next, status: isWon(next) ? 'won' : 'playing' },
    move: { vehicleId, distance, exited },
  };
}

/** Every vehicle that can legally move right now. */
export function legalMoves(state: GameState): string[] {
  // One grid for the whole board, not one per vehicle.
  const grid = buildOccupancyGrid(state);
  const movable: string[] = [];
  for (const v of state.vehicles) {
    if (travelWithGrid(state, v, grid) > 0) {
      movable.push(v.id);
    }
  }
  return movable;
}
