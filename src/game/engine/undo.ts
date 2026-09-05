/**
 * Undo history — PRD section 25.
 *
 * Snapshots are bounded. A GameState is small (tens of vehicles), so a cap of
 * 50 is far below any memory concern while covering any realistic undo run.
 *
 * History holds PRIOR states, not the current one. Undo pops the most recent
 * prior state and makes it current again.
 */

import type { GameState } from '../models/GameState';

export const MAX_HISTORY = 50;

export function pushHistory(
  history: GameState[],
  state: GameState,
): GameState[] {
  const next = [...history, state];
  // Drop the oldest entries; the player can always still Reset.
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

/** Returns the previous state and the trimmed history, or null at the start. */
export function popHistory(
  history: GameState[],
): { state: GameState; history: GameState[] } | null {
  if (history.length === 0) {
    return null;
  }
  return {
    state: history[history.length - 1],
    history: history.slice(0, -1),
  };
}
