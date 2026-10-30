/** Authoring-time latency sampling; never imported by the app. */
import { performance } from 'node:perf_hooks';
import { createInitialState } from '../../src/game/models/GameState';
import type { Level } from '../../src/game/models/Level';
import { applyMove, legalMoves } from '../../src/game/engine/movement';
import { computeHint } from '../../src/game/engine/hint';
import { solve } from '../../src/game/engine/solver';

/** Same sampling policy as bench:hints, shared by generation and the CLI gate. */
export function hintSamples(
  level: Level,
): ReturnType<typeof createInitialState>[] {
  const start = createInitialState(level);
  const solution = solve(start);
  if (!solution) {
    throw new Error(`Level ${level.id} has no solution within budget`);
  }
  const samples = [start];
  let state = start;
  for (const id of solution.moves) {
    state = applyMove(state, id).state;
    if (state.vehicles.length > 0) {
      samples.push(state);
    }
  }
  for (const id of legalMoves(start)) {
    if (id !== solution.moves[0]) {
      const wandered = applyMove(start, id).state;
      if (wandered.vehicles.length > 0) {
        samples.push(wandered);
      }
    }
  }
  return samples;
}

/** Minimum of five timings per sampled position, matching bench:hints. */
export function worstHintMs(level: Level): number {
  let worst = 0;
  for (const state of hintSamples(level)) {
    let best = Infinity;
    for (let repeat = 0; repeat < 5; repeat++) {
      const started = performance.now();
      computeHint(state);
      best = Math.min(best, performance.now() - started);
    }
    worst = Math.max(worst, best);
  }
  return worst;
}
