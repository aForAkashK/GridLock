/**
 * Collision and occupancy queries.
 *
 * Pure functions over GameState. No React, no store, no side effects — every
 * function here must be callable thousands of times per second by the solver.
 */

import type { GameState } from '../models/GameState';
import { occupiedCells, type Vehicle } from '../models/Vehicle';

/**
 * Builds a gridSize x gridSize lookup of cell -> vehicle id (null when empty).
 *
 * The solver calls this in its inner loop, so it returns a flat array indexed
 * as `y * gridSize + x` rather than a nested structure.
 */
export function buildOccupancyGrid(state: GameState): Array<string | null> {
  const n = state.gridSize;
  const grid: Array<string | null> = new Array(n * n).fill(null);

  for (const v of state.vehicles) {
    for (const cell of occupiedCells(v)) {
      // A vehicle mid-exit can hang off the board; those cells simply have no
      // slot in the grid and nothing can collide with them.
      if (isInBounds(cell.x, cell.y, n)) {
        grid[cell.y * n + cell.x] = v.id;
      }
    }
  }

  return grid;
}

/** True when (x, y) lies inside the board. */
export function isInBounds(x: number, y: number, gridSize: number): boolean {
  return x >= 0 && y >= 0 && x < gridSize && y < gridSize;
}

/**
 * True when every cell the vehicle would occupy at (x, y) is free.
 * The vehicle's own current cells are treated as free.
 */
export function canOccupy(
  state: GameState,
  vehicle: Vehicle,
  x: number,
  y: number,
): boolean {
  const n = state.gridSize;
  const grid = buildOccupancyGrid(state);

  for (let dy = 0; dy < vehicle.height; dy++) {
    for (let dx = 0; dx < vehicle.width; dx++) {
      const cx = x + dx;
      const cy = y + dy;
      if (!isInBounds(cx, cy, n)) {
        return false;
      }
      const occupant = grid[cy * n + cx];
      if (occupant !== null && occupant !== vehicle.id) {
        return false;
      }
    }
  }

  return true;
}

/**
 * True when the vehicle, shifted by `steps` along its direction, no longer
 * overlaps the board at all — i.e. it has escaped.
 */
export function isFullyOffBoard(
  vehicle: Vehicle,
  dx: number,
  dy: number,
  steps: number,
  gridSize: number,
): boolean {
  const x = vehicle.x + dx * steps;
  const y = vehicle.y + dy * steps;
  return (
    x + vehicle.width - 1 < 0 ||
    x > gridSize - 1 ||
    y + vehicle.height - 1 < 0 ||
    y > gridSize - 1
  );
}

/** The vehicle occupying a given cell, or null when the cell is empty. */
export function vehicleAt(
  state: GameState,
  x: number,
  y: number,
): Vehicle | null {
  for (const v of state.vehicles) {
    if (
      x >= v.x &&
      x < v.x + v.width &&
      y >= v.y &&
      y < v.y + v.height
    ) {
      return v;
    }
  }
  return null;
}
