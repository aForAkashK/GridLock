/**
 * Level generator — PRD section 27's "Generator → Solver → Ship / Reject".
 *
 * Places vehicles at random, then throws almost all of them away. The solver
 * is the filter: a candidate ships only if it is solvable, hits a target par,
 * and is actually *interesting* (see below). Generating is cheap; judging is
 * the hard part, and that is what the solver is for.
 *
 * Deterministic: the same seed always produces the same level, so a level can
 * be regenerated or explained later.
 *
 * Usage: npx tsx tools/level-tools/generate-levels.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import type { Direction, Vehicle, VehicleType } from '../../src/game/models/Vehicle';
import type { Difficulty, Level } from '../../src/game/models/Level';
import { createInitialState } from '../../src/game/models/GameState';
import { legalMoves } from '../../src/game/engine/movement';
import { validateLevel } from '../../src/game/engine/levelValidator';
import { solve, VALIDATION_NODE_BUDGET } from '../../src/game/engine/solver';

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
function pickWeighted(r: number, table: Array<[VehicleType, number]>): VehicleType {
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

type Spec = {
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
        length === 3 ? TYPES_3[Math.floor(r * TYPES_3.length)] : pickWeighted(r, TYPES_2);

      cells.forEach(c => occupied.add(c));
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

/**
 * A board where every vehicle can already leave is not a puzzle — it is a list
 * of taps. Require that a meaningful share start blocked, so the player has an
 * ordering problem to solve rather than a chore to perform.
 */
function isInteresting(level: Level): boolean {
  const free = legalMoves(createInitialState(level)).length;
  return free <= level.vehicles.length - 2;
}

function generate(spec: Spec): { level: Level; seed: number } | null {
  for (let seed = spec.id * 100_000; seed < spec.id * 100_000 + 60_000; seed++) {
    const random = rng(seed);
    const vehicles = randomBoard(random, spec);
    if (vehicles.length < spec.vehicles) {
      continue;
    }

    const candidate: Level = {
      id: spec.id,
      gridSize: spec.gridSize,
      difficulty: spec.difficulty,
      vehicles,
    };

    if (!isInteresting(candidate)) {
      continue;
    }

    // Cheap gate first. `validateLevel` also measures worst-case HINT cost by
    // re-solving from many reachable states, which is far more expensive than
    // a single solve — no point paying it for a board whose par is out of band.
    const solution = solve(createInitialState(candidate), VALIDATION_NODE_BUDGET);
    if (!solution) {
      continue;
    }
    const par = solution.moves.length;
    if (par < spec.minPar || par > spec.maxPar) {
      continue;
    }

    const result = validateLevel(candidate);
    if (!result.valid || result.parMoves === undefined) {
      continue;
    }

    return { level: { ...candidate, parMoves: result.parMoves }, seed };
  }
  return null;
}

// Difficulty ramps on two axes at once: more vehicles (denser board) and a
// longer required solution (deeper lookahead). PRD §8 bands.
const SPECS: Spec[] = [
  { id: 7, gridSize: 6, difficulty: 'easy', vehicles: 5, minPar: 6, maxPar: 7 },
  { id: 8, gridSize: 6, difficulty: 'easy', vehicles: 6, minPar: 6, maxPar: 7 },
  { id: 9, gridSize: 6, difficulty: 'easy', vehicles: 6, minPar: 7, maxPar: 8 },
  { id: 10, gridSize: 6, difficulty: 'easy', vehicles: 6, minPar: 7, maxPar: 8 },
  { id: 11, gridSize: 6, difficulty: 'medium', vehicles: 7, minPar: 8, maxPar: 9 },
  { id: 12, gridSize: 6, difficulty: 'medium', vehicles: 7, minPar: 8, maxPar: 9 },
  { id: 13, gridSize: 6, difficulty: 'medium', vehicles: 7, minPar: 9, maxPar: 10 },
  { id: 14, gridSize: 6, difficulty: 'medium', vehicles: 8, minPar: 9, maxPar: 10 },
  { id: 15, gridSize: 6, difficulty: 'medium', vehicles: 8, minPar: 9, maxPar: 11 },
  { id: 16, gridSize: 6, difficulty: 'medium', vehicles: 8, minPar: 10, maxPar: 11 },
  { id: 17, gridSize: 6, difficulty: 'medium', vehicles: 8, minPar: 10, maxPar: 12 },
  { id: 18, gridSize: 6, difficulty: 'hard', vehicles: 9, minPar: 10, maxPar: 12 },
  { id: 19, gridSize: 6, difficulty: 'hard', vehicles: 9, minPar: 11, maxPar: 13 },
  { id: 20, gridSize: 6, difficulty: 'hard', vehicles: 9, minPar: 11, maxPar: 14 },
];

/**
 * Levels 21-50.
 *
 * Par tops out around 13-14 on a 6x6 board: par only exceeds the vehicle count
 * when vehicles must move MORE THAN ONCE, and 36 cells leaves little room to
 * shuffle. Pushing past that does not make boards harder, it makes them
 * unsolvable — levels 29, 30 and 34 failed 60,000 attempts at par 14+.
 *
 * So these bands target what is actually reachable, and difficulty ramps on
 * density and vehicle count instead. Real depth beyond this needs new
 * mechanics (PRD section 9), not bigger numbers.
 */
for (let id = 21; id <= 50; id++) {
  const step = id - 21; // 0..29
  SPECS.push({
    id,
    gridSize: 6,
    difficulty: id <= 35 ? 'medium' : 'hard',
    vehicles: 9 + Math.floor(step / 12), // 9, 10, 11
    minPar: 11 + Math.floor(step / 15), // 11, 12
    maxPar: 14,
  });
}

function main(): void {
  const failures: number[] = [];

  for (const spec of SPECS) {
    const found = generate(spec);
    if (!found) {
      failures.push(spec.id);
      console.error(
        `✗ Level ${spec.id}: no candidate met par ${spec.minPar}-${spec.maxPar} with ${spec.vehicles} vehicles`,
      );
      continue;
    }

    const file = join(
      __dirname,
      '../../src/game/levels',
      `level${String(spec.id).padStart(3, '0')}.json`,
    );
    writeFileSync(file, JSON.stringify(found.level, null, 2) + '\n');
    console.log(
      `✓ Level ${String(spec.id).padStart(3)}  par ${String(found.level.parMoves).padStart(2)}  ` +
        `${found.level.vehicles.length} vehicles  seed ${found.seed}`,
    );
  }

  if (failures.length > 0) {
    console.error(`\nFailed to generate: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\nRegenerate the registry, then run `npm run validate:levels`.');
}

main();
