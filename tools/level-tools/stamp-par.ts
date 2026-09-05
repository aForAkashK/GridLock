/**
 * Writes solver-computed `parMoves` into every level file.
 *
 * Run with `npm run stamp:par` after hand-authoring a level. Par is never
 * typed by a human — a wrong par silently mis-rates the level and hands out
 * "perfect solve" badges for sloppy play.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Level } from '../../src/game/models/Level';
import { createInitialState } from '../../src/game/models/GameState';
import { solve } from '../../src/game/engine/solver';
import { LEVELS } from '../../src/game/levels';

function main(): void {
  let changed = 0;

  for (const level of LEVELS) {
    const file = join(
      __dirname,
      '../../src/game/levels',
      `level${String(level.id).padStart(3, '0')}.json`,
    );

    const solution = solve(createInitialState(level));
    if (!solution) {
      console.error(`✗ Level ${level.id} is unsolvable — not stamping`);
      process.exit(1);
    }

    const par = solution.moves.length;
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Level;

    if (raw.parMoves === par) {
      continue;
    }

    // Rebuild with parMoves in a stable position rather than appended, so the
    // JSON diff stays readable.
    const { id, gridSize, difficulty, vehicles, ...rest } = raw;
    const updated = { id, gridSize, difficulty, parMoves: par, ...rest, vehicles };
    writeFileSync(file, JSON.stringify(updated, null, 2) + '\n');
    console.log(
      `  level ${String(level.id).padStart(3)}  parMoves ${raw.parMoves ?? '—'} → ${par}`,
    );
    changed++;
  }

  console.log(changed === 0 ? 'All levels already stamped.' : `Stamped ${changed} level(s).`);
}

main();
