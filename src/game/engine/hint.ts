/**
 * Hint engine.
 *
 * Per PRD section 26 a hint must be a genuinely useful move, not a random
 * highlight. It runs the solver from the CURRENT board — so a hint stays
 * correct even after the player has wandered off the intended solution path.
 *
 * A hint that suggests a useless move is worse than no hint: it teaches the
 * player that hints cannot be trusted, and they stop spending coins on them.
 */

import type { GameState } from '../models/GameState';
import { HINT_NODE_BUDGET, solve } from './solver';

export type Hint = {
  vehicleId: string;
  /** Remaining moves from here, for a "you're close" cue in the UI. */
  movesRemaining: number;
};

/** Null when the board is unsolvable from here — the UI should offer Reset. */
export function computeHint(state: GameState): Hint | null {
  const solution = solve(state, HINT_NODE_BUDGET);
  if (!solution || solution.moves.length === 0) {
    return null;
  }
  return {
    vehicleId: solution.moves[0],
    movesRemaining: solution.moves.length,
  };
}
