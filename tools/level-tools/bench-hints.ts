/**
 * Hint latency benchmark.
 *
 * GAME_DESIGN.md budgets a hint at under 50ms on a mid-range Android device.
 * This measures the solver on every shipped level, from every state along the
 * optimal path AND from deliberately wasteful off-path states — because a
 * player who has wandered is exactly who buys a hint.
 *
 * Caveat this number honestly: Node on a dev machine is several times faster
 * than Hermes on a mid-range phone. Treat the budget here as roughly 5ms, not
 * 50ms, and confirm on real hardware before trusting it.
 */

import { LEVELS } from '../../src/game/levels';
import { worstHintMs } from './hint-benchmark';

/** Desktop budget only. Confirm the 50ms target on real Android hardware. */
const NODE_BUDGET_MS = 6;

function main(): void {
  let worstOverall = 0;
  let worstLevel = 0;
  const over: number[] = [];

  for (const level of LEVELS) {
    const worst = worstHintMs(level);

    if (worst > NODE_BUDGET_MS) {
      over.push(level.id);
    }
    if (worst > worstOverall) {
      worstOverall = worst;
      worstLevel = level.id;
    }

    console.log(
      `  level ${String(level.id).padStart(3)}  worst hint ${worst.toFixed(2)}ms`,
    );
  }

  console.log('');
  console.log(
    `Worst overall: ${worstOverall.toFixed(2)}ms on level ${worstLevel} ` +
      `(Node budget ${NODE_BUDGET_MS}ms)`,
  );

  if (over.length > 0) {
    console.error(`Over budget: ${over.join(', ')}`);
    process.exit(1);
  }
  console.log('All levels within the hint budget.');
}

main();
