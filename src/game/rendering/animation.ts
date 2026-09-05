/**
 * Motion timing and easing.
 *
 * These numbers are the game's feel, not decoration (GAME_DESIGN.md). Under
 * 150ms a move reads as teleporting and the eye cannot follow which vehicle
 * moved; over 350ms the player is waiting, and waiting compounds across a
 * level.
 */

import { Easing } from 'react-native-reanimated';
import { Timing } from '../../theme/tokens';

/**
 * Duration for a move of `cells` cells.
 *
 * Deliberately sub-linear: a five-cell move takes longer than a one-cell move,
 * but nowhere near five times as long. Linear scaling makes long moves feel
 * sluggish even though each individual cell is "correctly" timed.
 */
export function moveDuration(cells: number): number {
  const raw = Timing.movePerCellMs * Math.sqrt(Math.max(cells, 1)) * 2.2;
  return Math.min(Math.max(raw, Timing.moveMinMs), Timing.moveMaxMs);
}

/**
 * Pulls away sharply, settles into the stop. This asymmetry is what sells the
 * weight of the vehicle — a symmetric ease reads as a slide, not a drive.
 */
export const MOVE_EASING = Easing.out(Easing.cubic);

/**
 * Accelerating. A vehicle leaving the board must never decelerate into the
 * edge — it drives off, it does not park there (DESIGN.md).
 */
export const EXIT_EASING = Easing.in(Easing.cubic);

/** Snappy, symmetric — the shake is information, not drama. */
export const SHAKE_EASING = Easing.inOut(Easing.quad);

/** How far a blocked vehicle nudges, as a fraction of a cell. */
export const SHAKE_FRACTION = 0.12;
