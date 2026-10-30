/** Validate a cumulative, append-only catalog before Firebase Hosting deployment. */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { LEVELS } from '../../src/game/levels';
import { validateLevel } from '../../src/game/engine/levelValidator';
import {
  assertAppendOnly,
  parseCatalog,
  parseDeliveredLevel,
  type LevelCatalog,
} from '../../src/services/levels/catalog';
import { LEVEL_CATALOG_URL } from '../../src/services/levels/transport';
import { layoutKey } from './generator';
import { worstHintMs } from './hint-benchmark';

let BASE_ID = 100;
let rulesVersion: 1 | 2 = 2;
let OUTPUT = resolve(
  __dirname,
  '../../level-content/public/levels/catalog-v2.json',
);

function verify(catalog: LevelCatalog): void {
  const seen = new Set(
    LEVELS.filter((level) => level.id <= BASE_ID).map(layoutKey),
  );
  for (const level of catalog.levels) {
    const key = layoutKey(level);
    if (seen.has(key)) {
      throw new Error(`Level ${level.id} repeats an existing layout`);
    }
    seen.add(key);
    const validation = validateLevel(level);
    if (!validation.valid) {
      throw new Error(
        `Level ${level.id}: ${JSON.stringify(validation.issues)}`,
      );
    }
    const hintMs = worstHintMs(level);
    if (hintMs > 6) {
      throw new Error(
        `Level ${level.id}: hint ${hintMs.toFixed(
          2,
        )}ms exceeds the 6ms Node gate`,
      );
    }
    console.log(
      `Verified ${level.id}: par ${
        validation.parMoves
      }, sampled hint ${hintMs.toFixed(2)}ms`,
    );
  }
}

async function verifyRemote(local: LevelCatalog): Promise<void> {
  const response = await fetch(
    LEVEL_CATALOG_URL.replace(
      'catalog-v2.json',
      `catalog-v${rulesVersion}.json`,
    ),
    {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    },
  );
  if (response.status === 404) {
    console.log('No published catalog yet; ready for the first release.');
    return;
  }
  if (!response.ok) {
    throw new Error(
      `Cannot verify the published catalog: HTTP ${response.status}`,
    );
  }
  const remote = parseCatalog(await response.text(), BASE_ID, rulesVersion);
  if (local.revision < remote.revision) {
    throw new Error('Local revision is older than the published catalog');
  }
  assertAppendOnly(remote, local);
  if (
    remote.revision === local.revision &&
    JSON.stringify(remote) !== JSON.stringify(local)
  ) {
    throw new Error('Published content changed without a revision increment');
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      channel: { type: 'string' },
      from: { type: 'string' },
      revision: { type: 'string' },
      verify: { type: 'boolean' },
      remote: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(
      'Prepare: npm run prepare:levels -- --from <new-level-directory> [--revision N]\nVerify: npm run verify:level-release [-- --remote]\nPublish: npm run publish:levels\nOnly the separate level Hosting site is deployed; no app build or Firestore change.',
    );
    return;
  }
  if (values.channel !== undefined && !['1', '2'].includes(values.channel)) {
    throw new Error('Channel must be 1 or 2');
  }
  rulesVersion = values.channel === '1' ? 1 : 2;
  BASE_ID = rulesVersion === 1 ? 50 : 100;
  OUTPUT = resolve(
    __dirname,
    `../../level-content/public/levels/catalog-v${rulesVersion}.json`,
  );
  const previous = existsSync(OUTPUT)
    ? parseCatalog(readFileSync(OUTPUT, 'utf8'), BASE_ID, rulesVersion)
    : null;
  if (values.verify) {
    if (!previous) {
      throw new Error('Prepare a catalog before publishing');
    }
    verify(previous);
    if (values.remote) {
      await verifyRemote(previous);
    }
    console.log(
      `Catalog revision ${previous.revision}: ${previous.levels.length} remote levels ready.`,
    );
    return;
  }
  if (!values.from || values.remote) {
    throw new Error(
      'Use --from <directory> to prepare, or --verify [--remote]',
    );
  }
  const directory = resolve(values.from);
  const files = readdirSync(directory).filter((file) =>
    /^level\d+\.json$/.test(file),
  );
  if (files.length === 0) {
    throw new Error('No levelNNN.json files found');
  }
  const additions = files.map((file) =>
    parseDeliveredLevel(
      JSON.parse(readFileSync(join(directory, file), 'utf8')),
      rulesVersion,
    ),
  );
  const revision =
    values.revision === undefined
      ? (previous?.revision ?? 0) + 1
      : Number(values.revision);
  if (previous && revision <= previous.revision) {
    throw new Error('New releases require an increasing revision');
  }
  const candidate = parseCatalog(
    JSON.stringify({
      formatVersion: 1,
      rulesVersion,
      revision,
      baseLevelId: BASE_ID,
      levels: [...(previous?.levels ?? []), ...additions].sort(
        (a, b) => a.id - b.id,
      ),
    }),
    BASE_ID,
    rulesVersion,
  );
  assertAppendOnly(previous, candidate);
  verify(candidate);
  // One atomic catalog file: a failed validation cannot replace the prior release.
  mkdirSync(dirname(OUTPUT), { recursive: true });
  const temporary = `${OUTPUT}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(candidate) + '\n', { flag: 'wx' });
  renameSync(temporary, OUTPUT);
  console.log(
    `Prepared revision ${candidate.revision}, levels ${BASE_ID + 1}–${
      BASE_ID + candidate.levels.length
    }. Run npm run publish:levels to deliver them.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
