export const BUNDLED_LEVEL_COUNT = 100;
export const ENDLESS_BATCH_SIZE = 20;
// The existing cloud save permits 2,000 completed level IDs.
export const LAST_CAMPAIGN_LEVEL = 2000;
export const ENDLESS_GRID_SIZE = 8;

export function nextBatchTarget(completed: number[]): number {
  const done = new Set(completed);
  let cleared = 0;
  while (done.has(cleared + 1) && cleared < LAST_CAMPAIGN_LEVEL) {
    cleared++;
  }
  if (cleared < BUNDLED_LEVEL_COUNT - 1) return BUNDLED_LEVEL_COUNT;
  const batches =
    1 + Math.floor((cleared + 1 - BUNDLED_LEVEL_COUNT) / ENDLESS_BATCH_SIZE);
  return Math.min(
    LAST_CAMPAIGN_LEVEL,
    BUNDLED_LEVEL_COUNT + batches * ENDLESS_BATCH_SIZE
  );
}
