/**
 * Level validation — PRD section 27. No level ships without passing this.
 *
 * Run as a build-time gate (see tools/level-tools), never on device.
 */

import type { Level } from '../models/Level';
import { createInitialState } from '../models/GameState';
import { occupiedCells } from '../models/Vehicle';
import { applyMove, legalMoves } from './movement';
import {
  HINT_NODE_BUDGET,
  search,
  solve,
  VALIDATION_NODE_BUDGET,
} from './solver';

export type ValidationIssue = {
  code:
    | 'OUT_OF_BOUNDS'
    | 'OVERLAP'
    | 'INVALID_SIZE'
    | 'DUPLICATE_ID'
    | 'UNSOLVABLE'
    | 'TRIVIAL'
    | 'TOO_COMPLEX'
    | 'PAR_MISMATCH';
  message: string;
  vehicleId?: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
  /** Shortest solution length, present only when the level is solvable. */
  parMoves?: number;
  /** Search size from the starting board. */
  nodesExplored?: number;
  /**
   * The expensive one: the largest search any single hint on this level could
   * trigger, across states the player can realistically reach.
   */
  worstHintNodes?: number;
};

/** A level solvable in one move teaches nothing except in the first few. */
const TRIVIAL_PAR = 1;
const TUTORIAL_CUTOFF_ID = 3;

/**
 * The cost of the most expensive hint the level can produce.
 *
 * Measuring only the opening board — which this used to do — understates it
 * badly: a hint is computed from wherever the player actually is, and a player
 * who has wandered off the optimal line is precisely the one who buys a hint.
 * So we sample the states they realistically reach: every position along the
 * optimal solution, plus every position one non-optimal move from the start.
 *
 * Unsolvable positions count too. Proving a board unsolvable still costs real
 * time, and that time is paid by a player staring at a spinner.
 */
function worstHintCost(level: Level): number {
  const start = createInitialState(level);
  const opening = search(start, VALIDATION_NODE_BUDGET);
  if (!opening.solution) {
    return opening.nodesExplored;
  }

  let worst = opening.nodesExplored;

  let state = start;
  for (const id of opening.solution.moves) {
    state = applyMove(state, id).state;
    if (state.vehicles.length === 0) {
      break;
    }
    worst = Math.max(worst, search(state, HINT_NODE_BUDGET).nodesExplored);
  }

  const best = opening.solution.moves[0];
  for (const id of legalMoves(start)) {
    if (id === best) {
      continue;
    }
    const wandered = applyMove(start, id).state;
    if (wandered.vehicles.length === 0) {
      continue;
    }
    worst = Math.max(worst, search(wandered, HINT_NODE_BUDGET).nodesExplored);
  }

  return worst;
}

export function validateLevel(level: Level): ValidationResult {
  const issues: ValidationIssue[] = [];

  // --- Geometry. Checked first: an overlapping board makes the solver's
  // answer meaningless, so there is no point searching it.
  const seenIds = new Set<string>();
  const occupied = new Map<string, string>();

  for (const v of level.vehicles) {
    if (seenIds.has(v.id)) {
      issues.push({
        code: 'DUPLICATE_ID',
        message: `Duplicate vehicle id "${v.id}"`,
        vehicleId: v.id,
      });
    }
    seenIds.add(v.id);

    if (v.width < 1 || v.height < 1) {
      issues.push({
        code: 'INVALID_SIZE',
        message: `"${v.id}" has a non-positive size (${v.width}x${v.height})`,
        vehicleId: v.id,
      });
      continue;
    }

    if (
      v.x < 0 ||
      v.y < 0 ||
      v.x + v.width > level.gridSize ||
      v.y + v.height > level.gridSize
    ) {
      issues.push({
        code: 'OUT_OF_BOUNDS',
        message: `"${v.id}" at (${v.x},${v.y}) ${v.width}x${v.height} does not fit a ${level.gridSize}x${level.gridSize} board`,
        vehicleId: v.id,
      });
      continue;
    }

    for (const cell of occupiedCells(v)) {
      const key = `${cell.x},${cell.y}`;
      const other = occupied.get(key);
      if (other) {
        issues.push({
          code: 'OVERLAP',
          message: `"${v.id}" overlaps "${other}" at (${cell.x},${cell.y})`,
          vehicleId: v.id,
        });
      }
      occupied.set(key, v.id);
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  // --- Solvability.
  const solution = solve(createInitialState(level), VALIDATION_NODE_BUDGET);

  if (!solution) {
    issues.push({
      code: 'UNSOLVABLE',
      message: `No solution found within ${VALIDATION_NODE_BUDGET} nodes`,
    });
    return { valid: false, issues };
  }

  const parMoves = solution.moves.length;
  const nodesExplored = solution.nodesExplored;

  // --- Quality gates.
  if (parMoves <= TRIVIAL_PAR && level.id > TUTORIAL_CUTOFF_ID) {
    issues.push({
      code: 'TRIVIAL',
      message: `Solvable in ${parMoves} move — only acceptable for the first ${TUTORIAL_CUTOFF_ID} levels`,
    });
  }

  // A level the solver struggles with is a level whose HINT will be slow.
  // Reject it here rather than shipping a hint that misses its 50ms budget.
  const worstHintNodes = worstHintCost(level);
  if (worstHintNodes > HINT_NODE_BUDGET) {
    issues.push({
      code: 'TOO_COMPLEX',
      message: `Worst-case hint explores ${worstHintNodes} nodes, over the ${HINT_NODE_BUDGET} budget — hints would be slow`,
    });
  }

  if (level.parMoves !== undefined && level.parMoves !== parMoves) {
    issues.push({
      code: 'PAR_MISMATCH',
      message: `Declares parMoves ${level.parMoves} but the shortest solution is ${parMoves}`,
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    parMoves,
    nodesExplored,
    worstHintNodes,
  };
}
