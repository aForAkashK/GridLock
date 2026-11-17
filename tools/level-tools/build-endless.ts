/** Produces the compact, immutable seed table for the offline campaign. */
import { writeFileSync } from "node:fs";
import { LEVELS } from "../../src/game/levels";
import {
  ENDLESS_GRID_SIZE,
  LAST_CAMPAIGN_LEVEL,
} from "../../src/game/levels/endlessPolicy";
import {
  randomBoard,
  layoutKey,
  seededRandom,
} from "../../src/game/levels/seededBoard";
import { createInitialState } from "../../src/game/models/GameState";
import type { Level } from "../../src/game/models/Level";
import { legalMoves } from "../../src/game/engine/movement";
import { solve } from "../../src/game/engine/solver";
import { validateLevel } from "../../src/game/engine/levelValidator";

const seen = new Set(
  LEVELS.filter((level) => level.gridSize === ENDLESS_GRID_SIZE).map(layoutKey)
);
const seeds: [number, number, number][] = [];
let worstHintNodes = 0;
for (let id = LEVELS.length + 1; id <= LAST_CAMPAIGN_LEVEL; id++) {
  const count = 12 + (Math.floor((id - LEVELS.length - 1) / 10) % 3);
  const base = id * 1_000_003;
  for (let attempt = 0; attempt < 10000; attempt++) {
    const seed = base + attempt;
    const vehicles = randomBoard(seededRandom(seed), {
      vehicles: count,
      gridSize: ENDLESS_GRID_SIZE,
    });
    if (vehicles.length !== count) continue;
    const level: Level = {
      id,
      gridSize: ENDLESS_GRID_SIZE,
      difficulty: "expert",
      vehicles,
    };
    const state = createInitialState(level);
    if (count - legalMoves(state).length < 3) continue;
    const solution = solve(state, 160);
    if (
      !solution ||
      solution.moves.length <= count ||
      solution.moves.length > count + 4
    )
      continue;
    const key = layoutKey(level);
    if (seen.has(key)) continue;
    const validation = validateLevel({
      ...level,
      parMoves: solution.moves.length,
    });
    if (!validation.valid || (validation.worstHintNodes ?? Infinity) > 1800)
      continue;
    worstHintNodes = Math.max(worstHintNodes, validation.worstHintNodes ?? 0);
    seen.add(key);
    seeds.push([seed, count, solution.moves.length]);
    break;
  }
  if (seeds.length !== id - LEVELS.length)
    throw new Error(`No validated candidate for level ${id}`);
}
const output =
  "[\n" +
  seeds.map((seed) => "  " + JSON.stringify(seed)).join(",\n") +
  "\n]\n";
// Never overwrite the versioned recipe table.
writeFileSync("src/game/levels/endlessSeedsV1.json", output, { flag: "wx" });
console.log(
  `Validated ${seeds.length} distinct 8×8 puzzles. Worst sampled hint explored ${worstHintNodes} nodes.`
);
