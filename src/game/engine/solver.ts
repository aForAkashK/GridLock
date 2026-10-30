/**
 * Shortest-path A* solver. Used at authoring time to validate levels and compute
 * par, and at runtime by the hint system.
 *
 * Every remaining vehicle requires at least one tap to escape. Using that
 * lower bound prioritises promising states without sacrificing shortest par.
 * Equal estimates favour fewer remaining vehicles, then insertion order.
 *
 * Runtime budget: a hint must resolve in under 50ms on a mid-range Android
 * device. If a level's search space exceeds that, the level is too complex and
 * the validator should reject it rather than the game shipping a slow hint.
 */

import type { GameState } from '../models/GameState';
import { isWon } from '../models/GameState';
import { successors } from './movement';

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
 * Stable string key for a board position, used to dedupe the search frontier.
 * Sorted by id so it is independent of the order vehicles happen to sit in
 * the array — `applyMove` preserves order today, but relying on that would be
 * a silent correctness bug the day it stops being true.
 *
 * An escaped vehicle is removed from `vehicles` entirely, so positions alone
 * fully determine the board; `escaped` needs no representation here.
 */
export function serializeState(state: GameState): string {
  return state.vehicles
    .map((v) => `${v.id}@${v.x},${v.y}`)
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

type Entry = {
  state: GameState;
  key: string;
  cost: number;
  estimate: number;
  order: number;
};

function before(a: Entry, b: Entry): boolean {
  return (
    a.estimate < b.estimate ||
    (a.estimate === b.estimate &&
      (a.state.vehicles.length < b.state.vehicles.length ||
        (a.state.vehicles.length === b.state.vehicles.length &&
          a.order < b.order)))
  );
}

/** Binary min-heap: no sorting the whole frontier on each expansion. */
class Frontier {
  private entries: Entry[] = [];

  push(entry: Entry): void {
    let index = this.entries.length;
    this.entries.push(entry);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!before(entry, this.entries[parent])) {
        break;
      }
      this.entries[index] = this.entries[parent];
      index = parent;
    }
    this.entries[index] = entry;
  }

  pop(): Entry | undefined {
    const first = this.entries[0];
    const last = this.entries.pop();
    if (this.entries.length === 0 || !last) {
      return first;
    }
    let index = 0;
    while (index * 2 + 1 < this.entries.length) {
      let child = index * 2 + 1;
      if (
        child + 1 < this.entries.length &&
        before(this.entries[child + 1], this.entries[child])
      ) {
        child++;
      }
      if (!before(this.entries[child], last)) {
        break;
      }
      this.entries[index] = this.entries[child];
      index = child;
    }
    this.entries[index] = last;
    return first;
  }
}

/**
 * The bounded search. Returns the node count even on failure, which `solve` throws
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
  const costs = new Map<string, number>([[startKey, 0]]);
  const frontier = new Frontier();
  let order = 0;
  frontier.push({
    state: start,
    key: startKey,
    cost: 0,
    estimate: start.vehicles.length,
    order: order++,
  });
  let explored = 0;

  while (explored < maxNodes) {
    const entry = frontier.pop();
    if (!entry) {
      break;
    }
    const { state, key, cost } = entry;
    // A cheaper route can supersede an entry already in the heap.
    if (costs.get(key) !== cost) {
      continue;
    }
    explored++;
    if (isWon(state)) {
      return {
        solution: { moves: reconstruct(parents, key), nodesExplored: explored },
        nodesExplored: explored,
      };
    }

    for (const { state: next, move } of successors(state)) {
      if (!move) {
        continue;
      }
      const nextKey = serializeState(next);
      const nextCost = cost + 1;
      if (nextCost >= (costs.get(nextKey) ?? Infinity)) {
        continue;
      }
      costs.set(nextKey, nextCost);
      parents.set(nextKey, { prevKey: key, move: move.vehicleId });
      frontier.push({
        state: next,
        key: nextKey,
        cost: nextCost,
        estimate: nextCost + next.vehicles.length,
        order: order++,
      });
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
