/** Safe, offline level authoring. Run with --help for options. */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import type { Difficulty, Level } from '../../src/game/models/Level';
import {
  generateLevel,
  layoutKey,
  validateSpec,
  type GenerationSpec,
} from './generator';

const HELP = `Generate reviewed candidates without changing the shipped registry.

npm run generate:levels -- --start 51 --count 5 --out generated-levels/batch-51

Options (all numeric options except max-hint-ms require integers):
  --start 51          First level ID
  --count 1           Number of candidates; the entire batch must succeed
  --grid 6            Grid size, 3..12 (released app supports 6, 7, 8)
  --vehicles 10       Vehicle count (at least 2)
  --difficulty hard   Label: easy, medium, hard, expert; not an automatic rating
  --min-par 11        Minimum shortest solution length (>= vehicle count)
  --max-par 14        Maximum shortest solution length
  --min-blocked 2     Minimum vehicles unable to move initially
  --min-extra 1       Minimum par minus vehicle count
  --min-waves 2       Minimum exit-only clearing waves
  --min-score 8       Minimum heuristic design score
  --max-hint-ms 6     Maximum sampled Node hint latency (not a device guarantee)
  --seed 5100000      First uint32 seed; each level gets a disjoint attempt range
  --attempts 10000    Maximum candidates tried per level
  --out generated-levels/batch-<start>   New output directory; never overwritten
  --reproduce        Recreate one accepted seed; skips duplicate/ID exclusion
  --help             Show this help

Every level stores its accepted seed, settings and design metrics. Generation
is deterministic except for the machine-dependent timing gate. To regenerate
one accepted board, use --reproduce with its seed and settings (one attempt).
Existing JSON levels in src/game/levels and generated-levels are excluded,
including rotated/cosmetic duplicates. Review exported JSON before registering.
`;

function existingLevels(directory: string): Level[] {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return existingLevels(path);
    }
    if (!/^level\d+\.json$/.test(entry.name)) {
      return [];
    }
    return [JSON.parse(readFileSync(path, 'utf8')) as Level];
  });
}

function main(): void {
  const names = [
    'start',
    'count',
    'grid',
    'vehicles',
    'difficulty',
    'min-par',
    'max-par',
    'min-blocked',
    'min-extra',
    'min-waves',
    'min-score',
    'max-hint-ms',
    'seed',
    'attempts',
    'out',
  ];
  const options: Record<string, { type: 'string' | 'boolean' }> = {
    help: { type: 'boolean' },
    reproduce: { type: 'boolean' },
  };
  for (const name of names) {
    options[name] = { type: 'string' };
  }
  const { values } = parseArgs({ options, allowPositionals: false });
  if (values.help) {
    console.log(HELP);
    return;
  }
  const number = (name: string, fallback: number) =>
    values[name] === undefined ? fallback : Number(values[name]);
  const start = number('start', 51);
  const count = number('count', 1);
  const attempts = number('attempts', values.reproduce ? 1 : 10000);
  const seed = number('seed', start * 100000);
  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > 1000 ||
    !Number.isSafeInteger(start + count - 1)
  ) {
    throw new Error(
      '--count must be an integer from 1 to 1000 and IDs must be safe integers',
    );
  }
  if (
    values.reproduce &&
    (count !== 1 || attempts !== 1 || values.seed === undefined)
  ) {
    throw new Error('--reproduce requires --seed, --count 1 and --attempts 1');
  }
  const specs: GenerationSpec[] = Array.from(
    { length: count },
    (_, offset) => ({
      id: start + offset,
      seed: seed + offset * attempts,
      attempts,
      gridSize: number('grid', 6),
      vehicles: number('vehicles', 10),
      difficulty: String(values.difficulty ?? 'hard') as Difficulty,
      minPar: number('min-par', 11),
      maxPar: number('max-par', 14),
      minBlocked: number('min-blocked', 2),
      minExtraMoves: number('min-extra', 1),
      minExitWaves: number('min-waves', 2),
      minScore: number('min-score', 8),
      maxHintMs: number('max-hint-ms', 6),
    }),
  );
  specs.forEach(validateSpec);
  const output = resolve(
    String(values.out ?? `generated-levels/batch-${start}`),
  );
  if (existsSync(output)) {
    throw new Error(
      `Output already exists; choose a new --out directory: ${output}`,
    );
  }
  const shipped = existingLevels(resolve(__dirname, '../../src/game/levels'));
  const reviewed = existingLevels(resolve(__dirname, '../../generated-levels'));
  if (
    !values.reproduce &&
    specs.some((spec) => shipped.some((level) => level.id === spec.id))
  ) {
    throw new Error('Requested IDs overlap shipped levels; use new IDs');
  }
  const excluded = new Set(
    values.reproduce ? [] : [...shipped, ...reviewed].map(layoutKey),
  );
  const batch: NonNullable<ReturnType<typeof generateLevel>>[] = [];
  for (const spec of specs) {
    const found = generateLevel(spec, excluded);
    if (!found) {
      throw new Error(
        `Level ${spec.id}: no candidate met the settings in ${spec.attempts} attempts. No batch written.`,
      );
    }
    excluded.add(layoutKey(found.level));
    batch.push(found);
    console.log(
      `Level ${spec.id}: par ${found.level.parMoves}, score ${
        found.level.generation!.metrics.score
      }, hint ${found.hintMs.toFixed(2)}ms, seed ${
        found.level.generation!.seed
      }`,
    );
  }
  // No output until the entire requested batch succeeds. wx also protects files.
  mkdirSync(output, { recursive: true });
  for (const { level } of batch) {
    writeFileSync(
      join(output, `level${String(level.id).padStart(3, '0')}.json`),
      JSON.stringify(level, null, 2) + '\n',
      { flag: 'wx' },
    );
  }
  writeFileSync(
    join(output, 'manifest.json'),
    JSON.stringify(
      {
        version: 1,
        specs,
        levels: batch.map(({ level, hintMs }) => ({
          id: level.id,
          seed: level.generation!.seed,
          hintMs,
        })),
      },
      null,
      2,
    ) + '\n',
    { flag: 'wx' },
  );
  console.log(
    `Exported ${batch.length} candidate(s) to ${output}. Review before registering; shipped levels unchanged.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
