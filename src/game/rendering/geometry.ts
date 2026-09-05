/**
 * Cell -> pixel mapping. The single place grid coordinates become screen
 * coordinates.
 *
 * The engine deals only in cells and never imports this file. Keeping the
 * conversion in one module is what lets the board resize, or the art change,
 * without touching a rule.
 */

import type { Vehicle } from '../models/Vehicle';

export type BoardLayout = {
  /** Board edge length in px. Always square. */
  size: number;
  gridSize: number;
  cellSize: number;
  /** Gap between a vehicle and its cell edge, so neighbours read as separate. */
  inset: number;
  /** Board padding inside the canvas, leaving room for the drop shadow. */
  pad: number;
};

export function createLayout(size: number, gridSize: number): BoardLayout {
  const pad = Math.round(size * 0.03);
  const cellSize = (size - pad * 2) / gridSize;
  return {
    size,
    gridSize,
    cellSize,
    inset: Math.max(2, cellSize * 0.08),
    pad,
  };
}

export type PxRect = { x: number; y: number; width: number; height: number };

/** The pixel rect of a single grid cell. */
export function cellRect(l: BoardLayout, cx: number, cy: number): PxRect {
  return {
    x: l.pad + cx * l.cellSize,
    y: l.pad + cy * l.cellSize,
    width: l.cellSize,
    height: l.cellSize,
  };
}

/** The pixel rect a vehicle body occupies, inset from its cell footprint. */
export function vehicleRect(l: BoardLayout, v: Vehicle): PxRect {
  return {
    x: l.pad + v.x * l.cellSize + l.inset,
    y: l.pad + v.y * l.cellSize + l.inset,
    width: v.width * l.cellSize - l.inset * 2,
    height: v.height * l.cellSize - l.inset * 2,
  };
}

export function centerOf(r: PxRect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/**
 * Screen point -> grid cell. Returns null when the point falls outside the
 * board (in the padding, or beyond an edge).
 */
export function pxToCell(
  l: BoardLayout,
  px: number,
  py: number,
): { x: number; y: number } | null {
  const cx = Math.floor((px - l.pad) / l.cellSize);
  const cy = Math.floor((py - l.pad) / l.cellSize);
  if (cx < 0 || cy < 0 || cx >= l.gridSize || cy >= l.gridSize) {
    return null;
  }
  return { x: cx, y: cy };
}
