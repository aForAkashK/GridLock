/** Background delivery controller. Injected I/O keeps failure paths testable. */
import { assertAppendOnly, parseCatalog, type LevelCatalog } from './catalog';

export const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
export const RETRY_INTERVAL_MS = 5 * 60 * 1000;
export type DeliveryResult =
  | 'staged'
  | 'installed'
  | 'unchanged'
  | 'deferred'
  | 'failed'
  | 'throttled';

type Dependencies = {
  baseLevelId: number;
  rulesVersion?: 1 | 2;
  initial: LevelCatalog | null;
  fetchText: () => Promise<string>;
  persist: (catalog: LevelCatalog) => void;
  publish: (catalog: LevelCatalog) => void;
  schedule: () => void;
  canApply: () => boolean;
  now?: () => number;
  onError?: (error: unknown) => void;
};

export function createLevelDelivery(deps: Dependencies) {
  let current = deps.initial;
  let pending: string | null = null;
  let inFlight: Promise<DeliveryResult> | null = null;
  let nextCheckAt = -Infinity;
  const now = deps.now ?? Date.now;

  function applyPending(): DeliveryResult {
    if (!pending) {
      return 'unchanged';
    }
    if (!deps.canApply()) {
      return 'deferred';
    }
    const text = pending;
    pending = null;
    try {
      const next = parseCatalog(text, deps.baseLevelId, deps.rulesVersion ?? 1);
      if (current && next.revision < current.revision) {
        return 'unchanged';
      }
      assertAppendOnly(current, next);
      if (current && next.revision === current.revision) {
        if (JSON.stringify(current) !== JSON.stringify(next)) {
          throw new Error('Changed content must have a new revision');
        }
        return 'unchanged';
      }
      // One synchronous MMKV snapshot, then one reactive update. A failed write
      // never exposes a catalog that would disappear after restarting offline.
      deps.persist(next);
      current = next;
      deps.publish(next);
      return 'installed';
    } catch (error) {
      nextCheckAt = now() + RETRY_INTERVAL_MS;
      deps.onError?.(error);
      return 'failed';
    }
  }

  function refresh(): Promise<DeliveryResult> {
    if (inFlight) {
      return inFlight;
    }
    if (now() < nextCheckAt) {
      return Promise.resolve('throttled');
    }
    nextCheckAt = now() + REFRESH_INTERVAL_MS;
    inFlight = Promise.resolve()
      .then(() => deps.fetchText())
      .then((text): DeliveryResult => {
        pending = text;
        deps.schedule();
        return 'staged';
      })
      .catch((error): DeliveryResult => {
        nextCheckAt = now() + RETRY_INTERVAL_MS;
        deps.onError?.(error);
        return 'failed';
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }

  return { refresh, applyPending };
}
