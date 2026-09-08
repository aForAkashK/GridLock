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
  /** Playable edge length in px. The canvas is exactly this, and square. */
  size: number;
  gridSize: number;
  cellSize: number;
  /** Gap between a vehicle and its cell edge, so neighbours read as separate. */
  inset: number;
};

/**
 * The board surface is painted into `gameplay_bg.png`, and the canvas is laid
 * directly over its playing field — so the grid fills the canvas exactly and
 * there is no border art to leave room for.
 */
export function createLayout(size: number, gridSize: number): BoardLayout {
  const cellSize = size / gridSize;
  return {
    size,
    gridSize,
    cellSize,
    inset: Math.max(2, cellSize * 0.08),
  };
}

export type PxRect = { x: number; y: number; width: number; height: number };

/** The pixel rect of a single grid cell. */
export function cellRect(l: BoardLayout, cx: number, cy: number): PxRect {
  return {
    x: cx * l.cellSize,
    y: cy * l.cellSize,
    width: l.cellSize,
    height: l.cellSize,
  };
}

/** The pixel rect a vehicle body occupies, inset from its cell footprint. */
export function vehicleRect(l: BoardLayout, v: Vehicle): PxRect {
  return {
    x: v.x * l.cellSize + l.inset,
    y: v.y * l.cellSize + l.inset,
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
  const cx = Math.floor(px / l.cellSize);
  const cy = Math.floor(py / l.cellSize);
  if (cx < 0 || cy < 0 || cx >= l.gridSize || cy >= l.gridSize) {
    return null;
  }
  return { x: cx, y: cy };
}
