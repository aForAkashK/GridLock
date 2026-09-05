/**
 * Build-time level gate — PRD section 27.
 *
 * Run with `npm run validate:levels`. Exits non-zero on any invalid level so a
 * broken puzzle cannot reach a build. This never runs on device.
 */

import { LEVELS } from '../../src/game/levels';
import { validateLevel } from '../../src/game/engine/levelValidator';

function main(): void {
  const failures: number[] = [];

  for (const level of LEVELS) {
    const started = Date.now();
    const result = validateLevel(level);
    const ms = Date.now() - started;

    if (!result.valid) {
      failures.push(level.id);
      console.error(`✗ Level ${level.id}`);
      for (const issue of result.issues) {
        console.error(`    [${issue.code}] ${issue.message}`);
      }
      continue;
    }

    console.log(
      `✓ Level ${String(level.id).padStart(3)}  ` +
        `par ${String(result.parMoves).padStart(2)}  ` +
        `${String(result.nodesExplored).padStart(6)} nodes  ` +
        `${String(ms).padStart(4)}ms  ` +
        `${level.vehicles.length} vehicles`,
    );
  }

  console.log('');
  if (failures.length > 0) {
    console.error(
      `${failures.length} of ${LEVELS.length} level(s) failed: ${failures.join(', ')}`,
    );
    process.exit(1);
  }
  console.log(`All ${LEVELS.length} level(s) valid.`);
}

main();
