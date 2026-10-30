/** Seeded authoring only. No file I/O; gameplay rules come from the engine. */
import type {
  Direction,
  Vehicle,
  VehicleType,
} from '../../src/game/models/Vehicle';
import type { Difficulty, Level } from '../../src/game/models/Level';
import { createInitialState } from '../../src/game/models/GameState';
import {
  applyMove,
  legalMoves,
  wouldExit,
} from '../../src/game/engine/movement';
import { validateLevel } from '../../src/game/engine/levelValidator';
import { solve } from '../../src/game/engine/solver';
import { worstHintMs } from './hint-benchmark';

const COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

/**
 * Vehicle types by footprint. Every sprite is used, not just car and truck —
 * silhouette is one of the three cues a player reads a board by (DESIGN.md),
 * and while every car shares one sprite, varying the TYPE is what makes a
 * crowded board legible.
 */
const TYPES_3 = ['truck', 'bus'] as const;

/**
 * 2-cell vehicles are weighted toward `car`. Taxi, police and ambulance each
 * have ONE fixed look, so a board full of them is as hard to tell apart as a
 * board of identical cars. Cars carry the palette colour, which is what makes
 * "move the blue one" possible — the specials stay as occasional accents.
 */
const TYPES_2: Array<[VehicleType, number]> = [
  ['car', 0.6],
  ['taxi', 0.14],
  ['police', 0.13],
  ['ambulance', 0.13],
];

/** One random draw either way, so the generator's RNG sequence is unchanged. */
function pickWeighted(
  r: number,
  table: Array<[VehicleType, number]>,
): VehicleType {
  let acc = 0;
  for (const [type, weight] of table) {
    acc += weight;
    if (r < acc) {
      return type;
    }
  }
  return table[table.length - 1][0];
}

/** Types that take the level's palette colour; the rest have a fixed look. */
const COLOURED = new Set<VehicleType>(['car', 'truck', 'bus']);

/**
 * Deterministic PRNG (mulberry32) so a seed always yields the same board.
 * Bit twiddling is the algorithm, not a style slip.
 */
/* eslint-disable no-bitwise */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* eslint-enable no-bitwise */

export type Spec = {
  id: number;
  gridSize: number;
  difficulty: Difficulty;
  vehicles: number;
  minPar: number;
  maxPar: number;
};

function randomBoard(random: () => number, spec: Spec): Vehicle[] {
  const placed: Vehicle[] = [];
  let coloured = 0;
  const occupied = new Set<string>();

  for (let n = 0; n < spec.vehicles; n++) {
    // 40 attempts per vehicle, then give up on this candidate entirely —
    // a board too dense to place into is not one we want anyway.
    for (let attempt = 0; attempt < 40; attempt++) {
      const horizontal = random() < 0.5;
      // Mostly 2-cell cars, occasionally a 3-cell truck.
      const length = random() < 0.25 ? 3 : 2;
      const width = horizontal ? length : 1;
      const height = horizontal ? 1 : length;

      const x = Math.floor(random() * (spec.gridSize - width + 1));
      const y = Math.floor(random() * (spec.gridSize - height + 1));

      const cells: string[] = [];
      let clash = false;
      for (let dy = 0; dy < height && !clash; dy++) {
        for (let dx = 0; dx < width && !clash; dx++) {
          const key = `${x + dx},${y + dy}`;
          if (occupied.has(key)) {
            clash = true;
          }
          cells.push(key);
        }
      }
      if (clash) {
        continue;
      }

      // A vehicle only ever travels along its own long axis — a 2x1 car that
      // moves "up" would be pushing sideways, which the art cannot express.
      const axis: Direction[] = horizontal
        ? (['left', 'right'] as Direction[])
        : (['up', 'down'] as Direction[]);
      const direction = axis[Math.floor(random() * axis.length)];

      // Exactly ONE random() either way — keeping the RNG sequence identical is
      // what lets the reweight change vehicle identities without changing any
      // layout, par or solution.
      const r = random();
      const type: VehicleType =
        length === 3
          ? TYPES_3[Math.floor(r * TYPES_3.length)]
          : pickWeighted(r, TYPES_2);

      cells.forEach((c) => occupied.add(c));
      placed.push({
        id: `${type}-${n + 1}`,
        type,
        x,
        y,
        width,
        height,
        direction,
        // Cycle colours across coloured vehicles only, so neighbouring cars
        // differ. Fixed-look types ignore colour; 'red' is a placeholder.
        color: COLOURED.has(type) ? COLORS[coloured++ % COLORS.length] : 'red',
      });
      break;
    }
  }

  return placed;
}

export type Metrics = NonNullable<Level['generation']>['metrics'];
export type Settings = NonNullable<Level['generation']>['settings'];
export type GenerationSpec = Spec &
  Omit<Settings, 'vehicles' | 'minPar' | 'maxPar'> & {
    seed: number;
    attempts: number;
  };

/**
 * Canonical geometry over four rotations. IDs, colours and cosmetic types
 * are deliberately ignored. Include obstacle geometry for future authoring.
 */
export function layoutKey(level: Level): string {
  const directions: Direction[] = ['up', 'right', 'down', 'left'];
  let vehicles = level.vehicles;
  let obstacles = level.obstacles ?? [];
  const keys: string[] = [];
  for (let turn = 0; turn < 4; turn++) {
    const geometry = vehicles
      .map((v) => `${v.x},${v.y},${v.width},${v.height},${v.direction}`)
      .sort();
    const blocks = obstacles
      .map((v) => `${v.x},${v.y},${v.width},${v.height}`)
      .sort();
    keys.push(`${level.gridSize}:${geometry.join(';')}#${blocks.join(';')}`);
    vehicles = vehicles.map((v) => ({
      ...v,
      x: level.gridSize - v.y - v.height,
      y: v.x,
      width: v.height,
      height: v.width,
      direction: directions[(directions.indexOf(v.direction) + 1) % 4],
    }));
    obstacles = obstacles.map((v) => ({
      ...v,
      x: level.gridSize - v.y - v.height,
      y: v.x,
      width: v.height,
      height: v.width,
    }));
  }
  return keys.sort()[0];
}

/** Design heuristics, not a claim about human difficulty or solution uniqueness. */
export function scoreLevel(level: Level, moves: string[]): Metrics {
  const start = createInitialState(level);
  const initialBlocked = level.vehicles.length - legalMoves(start).length;
  const immediateExits = start.vehicles.filter((v) =>
    wouldExit(start, v.id),
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
    !['easy', 'medium', 'hard', 'expert'].includes(spec.difficulty)
  ) {
    throw new Error(
      'Invalid generator settings: check ranges, density, par and seed (see --help)',
    );
  }
}

export function generateLevel(
  spec: GenerationSpec,
  excluded: ReadonlySet<string> = new Set(),
): { level: Level; hintMs: number } | null {
  validateSpec(spec);
  for (let attempt = 0; attempt < spec.attempts; attempt++) {
    const seed = spec.seed + attempt;
    const vehicles = randomBoard(rng(seed), spec);
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
