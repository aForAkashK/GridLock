import { reportIssue } from "../diagnostics/client";
/** Native lifecycle adapter. Catalog processing is deferred during active play. */
import { AppState } from 'react-native';
import { CONTENT_RULES_VERSION } from './channel';
import { useGameStore } from '../../state/gameStore';
import { initialCatalog, installCatalog } from '../../state/levelCatalogStore';
import { BASE_LEVEL_ID, persistCatalog } from './catalogRepository';
import { createLevelDelivery, RETRY_INTERVAL_MS } from './levelDelivery';
import { fetchCatalogText } from './transport';

// RN 0.87 installs these timers in setUpTimers, but omits their TS globals.
// Keep the typing local rather than adding DOM types to the native project.
const idleRuntime = globalThis as typeof globalThis & {
  requestIdleCallback: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback: (handle: number) => void;
};

let started = false;
let gameVisible = false;
let foreground =
  AppState.currentState !== 'background' &&
  AppState.currentState !== 'inactive';
let idleHandle: number | null = null;

const delivery = createLevelDelivery({
  baseLevelId: BASE_LEVEL_ID,
  rulesVersion: CONTENT_RULES_VERSION,
  initial: initialCatalog,
  fetchText: () => fetchCatalogText(),
  persist: persistCatalog,
  publish: installCatalog,
  schedule: schedulePending,
  canApply: () =>
    foreground &&
    (!gameVisible || useGameStore.getState().state?.status === 'won'),
  onError: (error) => {
    reportIssue("levels.refresh", error);
    if (__DEV__) {
      console.warn('[levels] retaining local catalog:', String(error));
    }
  },
});

function schedulePending(): void {
  if (!started || !foreground || idleHandle !== null) {
    return;
  }
  idleHandle = idleRuntime.requestIdleCallback(
    () => {
      idleHandle = null;
      delivery.applyPending();
    },
    { timeout: 1000 },
  );
}

/** Called by navigation; it schedules work, never performs network I/O on a tap. */
export function setLevelDeliveryGameVisible(value: boolean): void {
  gameVisible = value;
  if (!value) {
    schedulePending();
  }
}

export function startLevelDelivery(): () => void {
  if (started) {
    return () => {};
  }
  started = true;
  foreground =
    AppState.currentState !== 'background' &&
    AppState.currentState !== 'inactive';
  // First render always uses bundled + locally cached data. Network work starts
  // after React has had a chance to paint and is independent of Firebase auth.
  const startup = idleRuntime.requestIdleCallback(
    () => {
      if (foreground) {
        schedulePending();
        delivery.refresh();
      }
    },
    { timeout: 1000 },
  );
  const interval = setInterval(() => {
    if (foreground) {
      delivery.refresh();
    }
  }, RETRY_INTERVAL_MS);
  const appSubscription = AppState.addEventListener('change', (state) => {
    foreground = state === 'active';
    if (foreground) {
      schedulePending();
      delivery.refresh();
    }
  });
  const unsubscribeGame = useGameStore.subscribe((state, previous) => {
    if (state.state?.status === 'won' && previous.state?.status !== 'won') {
      schedulePending();
    }
  });
  return () => {
    started = false;
    idleRuntime.cancelIdleCallback(startup);
    clearInterval(interval);
    if (idleHandle !== null) {
      idleRuntime.cancelIdleCallback(idleHandle);
      idleHandle = null;
    }
    appSubscription.remove();
    unsubscribeGame();
  };
}
