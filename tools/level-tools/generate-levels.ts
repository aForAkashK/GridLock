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
import type { Direction, Vehicle } from '../../src/game/models/Vehicle';
import type { Difficulty, Level } from '../../src/game/models/Level';
import { createInitialState } from '../../src/game/models/GameState';
import { legalMoves } from '../../src/game/engine/movement';
import { validateLevel } from '../../src/game/engine/levelValidator';

const COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

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

      cells.forEach(c => occupied.add(c));
      placed.push({
        id: `${length === 3 ? 'truck' : 'car'}-${n + 1}`,
        type: length === 3 ? 'truck' : 'car',
        x,
        y,
        width,
        height,
        direction,
        color: COLORS[n % COLORS.length],
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

    const result = validateLevel(candidate);
    if (!result.valid || result.parMoves === undefined) {
      continue;
    }
    if (result.parMoves < spec.minPar || result.parMoves > spec.maxPar) {
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
