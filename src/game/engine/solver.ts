/**
 * Breadth-first solver. Used at authoring time to validate levels and compute
 * par, and at runtime by the hint system.
 *
 * BFS rather than a heuristic search because we need the SHORTEST solution,
 * not just any solution: par drives the star rating and the "perfect solve"
 * badge, so an approximate answer would quietly mis-rate every level.
 *
 * Runtime budget: a hint must resolve in under 50ms on a mid-range Android
 * device. If a level's search space exceeds that, the level is too complex and
 * the validator should reject it rather than the game shipping a slow hint.
 */

import type { GameState } from '../models/GameState';
import { isWon } from '../models/GameState';
import { applyMove, legalMoves } from './movement';

export type Solution = {
  /** Vehicle ids in the order they must be moved. */
  moves: string[];
  /** Board states explored. Used to gauge puzzle complexity. */
  nodesExplored: number;
};

/**
 * Node cap for a runtime hint. Deliberately far below the authoring cap — a
 * hint that takes 200ms is worse than no hint, because the player taps again
 * thinking it did not register.
 */
export const HINT_NODE_BUDGET = 20_000;

/** Node cap for build-time validation, where we can afford to be thorough. */
export const VALIDATION_NODE_BUDGET = 200_000;

/**
 * Stable string key for a board position, used to dedupe the BFS frontier.
 * Sorted by id so it is independent of the order vehicles happen to sit in
 * the array — `applyMove` preserves order today, but relying on that would be
 * a silent correctness bug the day it stops being true.
 *
 * An escaped vehicle is removed from `vehicles` entirely, so positions alone
 * fully determine the board; `escaped` needs no representation here.
 */
export function serializeState(state: GameState): string {
  return state.vehicles
    .map(v => `${v.id}@${v.x},${v.y}`)
    .sort()
    .join('|');
}

type Trail = { prevKey: string | null; move: string | null };

function reconstruct(parents: Map<string, Trail>, endKey: string): string[] {
  const moves: string[] = [];
  let key: string | null = endKey;

  while (key !== null) {
    const trail: Trail | undefined = parents.get(key);
    if (!trail || trail.move === null) {
      break;
    }
    moves.push(trail.move);
    key = trail.prevKey;
  }

  return moves.reverse();
}

export type SearchResult = {
  /** Null when no solution was found within `maxNodes`. */
  solution: Solution | null;
  /** States explored, reported even when the search failed. */
  nodesExplored: number;
};

/**
 * The BFS itself. Returns the node count even on failure, which `solve` throws
 * away but the validator needs — an unsolvable position still costs real time
 * to prove unsolvable, and that cost lands on the player waiting for a hint.
 */
export function search(
  start: GameState,
  maxNodes = VALIDATION_NODE_BUDGET,
): SearchResult {
  if (isWon(start)) {
    return { solution: { moves: [], nodesExplored: 0 }, nodesExplored: 0 };
  }

  const startKey = serializeState(start);
  const parents = new Map<string, Trail>([
    [startKey, { prevKey: null, move: null }],
  ]);

  // A plain array with a moving head index. Array.shift() is O(n) and turns
  // the frontier into the bottleneck on larger boards.
  const frontier: Array<{ state: GameState; key: string }> = [
    { state: start, key: startKey },
  ];
  let head = 0;
  let explored = 0;

  while (head < frontier.length && explored < maxNodes) {
    const { state, key } = frontier[head++];
    explored++;

    for (const id of legalMoves(state)) {
      const { state: next, move } = applyMove(state, id);
      if (!move) {
        continue;
      }

      const nextKey = serializeState(next);
      if (parents.has(nextKey)) {
        continue;
      }
      parents.set(nextKey, { prevKey: key, move: id });

      if (isWon(next)) {
        return {
          solution: {
            moves: reconstruct(parents, nextKey),
            nodesExplored: explored,
          },
          nodesExplored: explored,
        };
      }

      frontier.push({ state: next, key: nextKey });
    }
  }

  return { solution: null, nodesExplored: explored };
}

/**
 * Finds the shortest solution, or null when the level is unsolvable within
 * `maxNodes`. A null return means "not solvable within budget" — the validator
 * treats that as a rejection either way, which is the safe reading.
 */
export function solve(
  start: GameState,
  maxNodes = VALIDATION_NODE_BUDGET,
): Solution | null {
  return search(start, maxNodes).solution;
}
