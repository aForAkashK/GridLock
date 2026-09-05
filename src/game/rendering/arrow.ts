/**
 * The direction arrow.
 *
 * This is the most important element on a vehicle — it is the only thing that
 * tells the player what a tap will do (DESIGN.md). It is drawn as a stroked
 * path with round caps rather than a filled polygon: strokes stay legible at
 * small cell sizes, scale cleanly, and give the soft toy-like feel the art
 * direction calls for.
 *
 * Built pointing RIGHT and rotated into place, so there is one shape to tune
 * rather than four that can drift apart.
 */

import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { Direction } from '../models/Vehicle';

/** Radians to rotate a right-pointing arrow to face `direction`. */
export function arrowRotation(direction: Direction): number {
  switch (direction) {
    case 'right':
      return 0;
    case 'down':
      return Math.PI / 2;
    case 'left':
      return Math.PI;
    case 'up':
      return -Math.PI / 2;
  }
}

/**
 * A stem plus a chevron head, centred on (cx, cy), pointing right.
 * `size` is the arrow's total length.
 */
export function makeArrowPath(cx: number, cy: number, size: number): SkPath {
  const p = Skia.Path.Make();
  const h = size / 2;

  // Stem — stops short of the head so the round caps do not overlap muddily.
  p.moveTo(cx - h * 0.8, cy);
  p.lineTo(cx + h * 0.1, cy);

  // Chevron head.
  p.moveTo(cx - h * 0.02, cy - h * 0.58);
  p.lineTo(cx + h * 0.62, cy);
  p.lineTo(cx - h * 0.02, cy + h * 0.58);

  return p;
}

/** Arrow length for a vehicle of this footprint. */
export function arrowSize(cellSize: number): number {
  return cellSize * 0.52;
}

export function arrowStroke(cellSize: number): number {
  return Math.max(2.5, cellSize * 0.085);
}
