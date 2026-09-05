/**
 * Vehicle model — the atomic unit of a level.
 *
 * Coordinates are grid cells, not pixels. The engine never knows about pixels;
 * the renderer is solely responsible for converting cells to screen space.
 * This is what lets artwork change without touching gameplay code.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export type VehicleType =
  | 'car'
  | 'bus'
  | 'truck'
  | 'taxi'
  | 'ambulance'
  | 'police';

export type Vehicle = {
  id: string;
  type: VehicleType;
  /** Column of the vehicle's top-left cell. 0-indexed from the left. */
  x: number;
  /** Row of the vehicle's top-left cell. 0-indexed from the top. */
  y: number;
  /** Width in cells. Always >= 1. */
  width: number;
  /** Height in cells. Always >= 1. */
  height: number;
  /** The only direction this vehicle may travel. */
  direction: Direction;
  /**
   * Palette key, not a hex value. Resolved through the theme so a skin swap
   * never requires editing level data.
   */
  color: string;
};

/** Unit vector for each direction, in grid space. y grows downward. */
export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/** Every grid cell a vehicle currently occupies. */
export function occupiedCells(v: Vehicle): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let dy = 0; dy < v.height; dy++) {
    for (let dx = 0; dx < v.width; dx++) {
      cells.push({ x: v.x + dx, y: v.y + dy });
    }
  }
  return cells;
}
