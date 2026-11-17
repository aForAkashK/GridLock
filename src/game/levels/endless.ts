import type { Level } from "../models/Level";
import seeds from "./endlessSeedsV1.json";
import { randomBoard, seededRandom } from "./seededBoard";
import {
  BUNDLED_LEVEL_COUNT,
  ENDLESS_BATCH_SIZE,
  ENDLESS_GRID_SIZE,
  LAST_CAMPAIGN_LEVEL,
} from "./endlessPolicy";

/** Materialize one batch on demand using the frozen V1 seed recipe. */
export function buildEndlessBatch(after: number): Level[] {
  if (
    !Number.isSafeInteger(after) ||
    after < BUNDLED_LEVEL_COUNT ||
    after >= LAST_CAMPAIGN_LEVEL ||
    (after - BUNDLED_LEVEL_COUNT) % ENDLESS_BATCH_SIZE !== 0
  ) {
    throw new Error("Invalid endless batch boundary");
  }
  const offset = after - BUNDLED_LEVEL_COUNT;
  return seeds
    .slice(offset, offset + ENDLESS_BATCH_SIZE)
    .map(([seed, count, parMoves], index) => ({
      id: after + index + 1,
      gridSize: ENDLESS_GRID_SIZE,
      difficulty: "expert",
      parMoves,
      vehicles: randomBoard(seededRandom(seed), {
        vehicles: count,
        gridSize: ENDLESS_GRID_SIZE,
      }),
    }));
}
