/** Seeded authoring only. No file I/O; gameplay rules come from the engine. */
import type { Level } from "../../src/game/models/Level";
import { createInitialState } from "../../src/game/models/GameState";
import {
  applyMove,
  legalMoves,
  wouldExit,
} from "../../src/game/engine/movement";
import { validateLevel } from "../../src/game/engine/levelValidator";
import { solve } from "../../src/game/engine/solver";
import { worstHintMs } from "./hint-benchmark";

import {
  layoutKey,
  randomBoard,
  seededRandom,
} from "../../src/game/levels/seededBoard";
export { layoutKey } from "../../src/game/levels/seededBoard";

export type Metrics = NonNullable<Level["generation"]>["metrics"];
export type Settings = NonNullable<Level["generation"]>["settings"];
export type GenerationSpec = {
  id: number;
  gridSize: number;
  difficulty: Level["difficulty"];
  vehicles: number;
  minPar: number;
  maxPar: number;
} & Omit<Settings, "vehicles" | "minPar" | "maxPar"> & {
    seed: number;
    attempts: number;
  };

/** Design heuristics, not a claim about human difficulty or solution uniqueness. */
export function scoreLevel(level: Level, moves: string[]): Metrics {
  const start = createInitialState(level);
  const initialBlocked = level.vehicles.length - legalMoves(start).length;
  const immediateExits = start.vehicles.filter((v) =>
    wouldExit(start, v.id)
  ).length;
  const extraMoves = moves.length - level.vehicles.length;
  let state = start;
  let forcedMoves = 0;
  for (const id of moves) {
    if (legalMoves(state).length === 1) {
      forcedMoves++;
    }
    state = applyMove(state, id).state;
  }

  // Peel off every currently clear exit as a wave, using engine rules.
  // Stops when partial moves are required; this is an exit-only chain metric,
  // not a complete dependency graph.
  state = start;
  let exitWaves = 0;
  while (state.vehicles.length > 0) {
    const exits = state.vehicles.filter((v) => wouldExit(state, v.id));
    if (exits.length === 0) {
      break;
    }
    exitWaves++;
    for (const vehicle of exits) {
      state = applyMove(state, vehicle.id).state;
    }
  }
  const score =
    initialBlocked +
    extraMoves * 3 +
    Math.max(0, exitWaves - 1) * 2 +
    forcedMoves;
  return {
    initialBlocked,
    immediateExits,
    extraMoves,
    exitWaves,
    forcedMoves,
    score,
  };
}

export function validateSpec(spec: GenerationSpec): void {
  const integers = [
    spec.id,
    spec.gridSize,
    spec.vehicles,
    spec.minPar,
    spec.maxPar,
    spec.minBlocked,
    spec.minExtraMoves,
    spec.minExitWaves,
    spec.minScore,
    spec.seed,
    spec.attempts,
  ];
  if (
    integers.some((n) => !Number.isSafeInteger(n) || n < 0) ||
    spec.id < 1 ||
    spec.gridSize < 3 ||
    spec.gridSize > 12 ||
    spec.vehicles < 2 ||
    spec.vehicles * 2 > spec.gridSize * spec.gridSize ||
    spec.minPar < spec.vehicles ||
    spec.maxPar < spec.minPar ||
    spec.minBlocked > spec.vehicles ||
    spec.minExitWaves > spec.vehicles ||
    spec.attempts < 1 ||
    spec.seed + spec.attempts - 1 > 0xffffffff ||
    !Number.isFinite(spec.maxHintMs) ||
    spec.maxHintMs <= 0 ||
    !["easy", "medium", "hard", "expert"].includes(spec.difficulty)
  ) {
    throw new Error(
      "Invalid generator settings: check ranges, density, par and seed (see --help)"
    );
  }
}

export function generateLevel(
  spec: GenerationSpec,
  excluded: ReadonlySet<string> = new Set()
): { level: Level; hintMs: number } | null {
  validateSpec(spec);
  for (let attempt = 0; attempt < spec.attempts; attempt++) {
    const seed = spec.seed + attempt;
    const vehicles = randomBoard(seededRandom(seed), spec);
    if (vehicles.length !== spec.vehicles) {
      continue;
    }
    const candidate: Level = {
      id: spec.id,
      gridSize: spec.gridSize,
      difficulty: spec.difficulty,
      vehicles,
    };
    if (excluded.has(layoutKey(candidate))) {
      continue;
    }
    const start = createInitialState(candidate);
    if (vehicles.length - legalMoves(start).length < spec.minBlocked) {
      continue;
    }
    const solution = solve(start);
    if (
      !solution ||
      solution.moves.length < spec.minPar ||
      solution.moves.length > spec.maxPar
    ) {
      continue;
    }
    const metrics = scoreLevel(candidate, solution.moves);
    if (
      metrics.extraMoves < spec.minExtraMoves ||
      metrics.exitWaves < spec.minExitWaves ||
      metrics.score < spec.minScore
    ) {
      continue;
    }
    const result = validateLevel(candidate);
    if (!result.valid) {
      continue;
    }
    const hintMs = worstHintMs(candidate);
    if (hintMs > spec.maxHintMs) {
      continue;
    }
    const {
      vehicles: count,
      minPar,
      maxPar,
      minBlocked,
      minExtraMoves,
      minExitWaves,
      minScore,
      maxHintMs,
    } = spec;
    return {
      level: {
        ...candidate,
        parMoves: solution.moves.length,
        generation: {
          version: 1,
          seed,
          settings: {
            vehicles: count,
            minPar,
            maxPar,
            minBlocked,
            minExtraMoves,
            minExitWaves,
            minScore,
            maxHintMs,
          },
          metrics,
        },
      },
      hintMs,
    };
  }
  return null;
}
