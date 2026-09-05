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

import { computeHint } from '../../src/game/engine/hint';
import { applyMove, legalMoves } from '../../src/game/engine/movement';
import { createInitialState } from '../../src/game/models/GameState';
import type { GameState } from '../../src/game/models/GameState';
import { solve } from '../../src/game/engine/solver';
import { LEVELS } from '../../src/game/levels';

/** Node-time budget, allowing ~8x headroom for Hermes on mid-range Android. */
const NODE_BUDGET_MS = 6;

/** Repeats per measurement. Wall-clock timing is noisy; one sample is a guess. */
const REPEATS = 5;

/**
 * Minimum of several runs, not the mean.
 *
 * A slow sample can be caused by anything on the machine — GC, another process,
 * the emulator. A fast one cannot be faster than the code allows. The minimum
 * is therefore the honest estimate of the code's cost, and it is what makes
 * this gate stable enough to fail meaningfully.
 */
function timeHint(state: GameState): number {
  let best = Infinity;
  for (let i = 0; i < REPEATS; i++) {
    const started = process.hrtime.bigint();
    computeHint(state);
    const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
    best = Math.min(best, ms);
  }
  return best;
}

function main(): void {
  let worstOverall = 0;
  let worstLevel = 0;
  const over: number[] = [];

  for (const level of LEVELS) {
    let worst = 0;
    let state = createInitialState(level);

    // Along the optimal path.
    worst = Math.max(worst, timeHint(state));
    for (const id of solve(state)!.moves) {
      state = applyMove(state, id).state;
      if (state.vehicles.length > 0) {
        worst = Math.max(worst, timeHint(state));
      }
    }

    // Off-path: from the start, take each legal first move that is NOT the
    // optimal one, and time a hint from there.
    const start = createInitialState(level);
    const best = solve(start)!.moves[0];
    for (const id of legalMoves(start)) {
      if (id === best) {
        continue;
      }
      const wandered = applyMove(start, id).state;
      if (wandered.vehicles.length > 0) {
        worst = Math.max(worst, timeHint(wandered));
      }
    }

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
