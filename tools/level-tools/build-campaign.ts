/** Reproducible, offline first-release campaign. Existing boards are immutable. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Level } from '../../src/game/models/Level';
import { generateLevel, layoutKey, type GenerationSpec } from './generator';

const directory = resolve(__dirname, '../../src/game/levels');
const excluded = new Set<string>();
for (let id = 1; id <= 100; id++) {
  const file = join(directory, `level${String(id).padStart(3, '0')}.json`);
  if (existsSync(file)) {
    excluded.add(layoutKey(JSON.parse(readFileSync(file, 'utf8')) as Level));
  }
}
for (let id = 51; id <= 100; id++) {
  const name = `level${String(id).padStart(3, '0')}.json`;
  const file = join(directory, name);
  if (existsSync(file)) {
    continue;
  }
  if (id <= 55) {
    const source = readFileSync(
      resolve(__dirname, '../../generated-levels/preview-51-55', name),
      'utf8',
    );
    writeFileSync(file, source, { flag: 'wx' });
    excluded.add(layoutKey(JSON.parse(source) as Level));
    console.log(`Preserved published level ${id}`);
    continue;
  }
  // Introduce each larger board with fewer vehicles before increasing density.
  const gridSize = id < 60 ? 6 : id < 80 ? 7 : 8;
  const vehicles =
    gridSize === 6
      ? 11
      : gridSize === 7
      ? 11 + Math.floor((id - 60) / 10)
      : 12 + Math.floor((id - 80) / 11);
  const prior = JSON.parse(
    readFileSync(
      join(directory, `level${String(id - 5).padStart(3, '0')}.json`),
      'utf8',
    ),
  ) as Level;
  const spec: GenerationSpec = {
    id,
    gridSize,
    vehicles,
    difficulty: id < 80 ? 'hard' : 'expert',
    minPar: Math.max(vehicles + 1, prior.parMoves ?? 0),
    maxPar: vehicles + 4,
    minBlocked: 3,
    minExtraMoves: 1,
    minExitWaves: 3,
    minScore: 12,
    maxHintMs: 3,
    attempts: 10000,
    seed: id * 100000,
  };
  const found = generateLevel(spec, excluded);
  if (!found) {
    throw new Error(
      `No acceptable board found for level ${id}; existing files preserved`,
    );
  }
  writeFileSync(file, JSON.stringify(found.level, null, 2) + '\n', {
    flag: 'wx',
  });
  excluded.add(layoutKey(found.level));
  console.log(
    `Generated ${id}: ${gridSize}x${gridSize}, ${vehicles} vehicles, par ${
      found.level.parMoves
    }, hint ${found.hintMs.toFixed(2)}ms`,
  );
}
