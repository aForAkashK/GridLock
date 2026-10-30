import { futureCatalog as feed } from '../../test-support/levelFixtures';
import { LEVELS } from '../../src/game/levels';

jest.mock('../../src/services/audio/audioService', () => ({ play: jest.fn() }));

const mockListeners = new Set<(state: string) => void>();
const mockAppState = {
  currentState: 'active',
  addEventListener: jest.fn(
    (_event: string, callback: (state: string) => void) => {
      mockListeners.add(callback);
      return { remove: () => mockListeners.delete(callback) };
    },
  ),
};
const mockFetchText = jest.fn();
const mockPersist = jest.fn();

jest.mock('react-native', () => ({ AppState: mockAppState }));
jest.mock('../../src/services/levels/transport', () => ({
  fetchCatalogText: mockFetchText,
}));
jest.mock('../../src/services/levels/catalogRepository', () => ({
  BASE_LEVEL_ID: 100,
  readCachedCatalog: () => null,
  persistCatalog: mockPersist,
}));

const callbacks = new Map<number, () => void>();
let counter = 0;
let stop: (() => void) | undefined;
async function idle(): Promise<void> {
  // Drain both idle callbacks and the downloader's promise chain; no real delay.
  for (let step = 0; step < 10; step++) {
    for (const [id, callback] of [...callbacks]) {
      callbacks.delete(id);
      callback();
    }
    await Promise.resolve();
  }
}
function foreground(state: string): void {
  mockAppState.currentState = state;
  mockListeners.forEach((callback) => callback(state));
}
function runtime() {
  return require('../../src/services/levels/levelDeliveryRuntime') as typeof import('../../src/services/levels/levelDeliveryRuntime');
}

describe('delivery lifecycle adapter', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    callbacks.clear();
    mockListeners.clear();
    mockAppState.currentState = 'active';
    mockFetchText.mockReset().mockResolvedValue(JSON.stringify(feed));
    mockPersist.mockClear();
    Object.assign(globalThis, {
      requestIdleCallback: (callback: () => void) => {
        const id = ++counter;
        callbacks.set(id, callback);
        return id;
      },
      cancelIdleCallback: (id: number) => callbacks.delete(id),
    });
  });
  afterEach(() => {
    stop?.();
    stop = undefined;
    jest.useRealTimers();
  });

  it('starts after an idle opportunity, then caches the received catalog', async () => {
    stop = runtime().startLevelDelivery();
    expect(mockFetchText).not.toHaveBeenCalled();
    await idle();
    expect(mockFetchText).toHaveBeenCalledTimes(1);
    expect(mockPersist).toHaveBeenCalledTimes(1);
  });
  it('waits through active play and installs when the board is won', async () => {
    const r = runtime();
    const { useGameStore } =
      require('../../src/state/gameStore') as typeof import('../../src/state/gameStore');
    useGameStore.getState().loadLevel(LEVELS[0]);
    r.setLevelDeliveryGameVisible(true);
    stop = r.startLevelDelivery();
    await idle();
    expect(mockPersist).not.toHaveBeenCalled();
    useGameStore.getState().skip();
    await idle();
    expect(mockPersist).toHaveBeenCalledTimes(1);
  });
  it('also installs staged content when leaving an unfinished puzzle', async () => {
    const r = runtime();
    r.setLevelDeliveryGameVisible(true);
    stop = r.startLevelDelivery();
    await idle();
    expect(mockPersist).not.toHaveBeenCalled();
    r.setLevelDeliveryGameVisible(false);
    await idle();
    expect(mockPersist).toHaveBeenCalledTimes(1);
  });
  it('does no fetching while backgrounded and restores checks on foreground', async () => {
    mockAppState.currentState = 'background';
    stop = runtime().startLevelDelivery();
    await idle();
    jest.advanceTimersByTime(5 * 60 * 1000);
    expect(mockFetchText).not.toHaveBeenCalled();
    foreground('active');
    await idle();
    expect(mockPersist).toHaveBeenCalledTimes(1);
  });
  it('removes timers and listeners during cleanup', () => {
    stop = runtime().startLevelDelivery();
    stop();
    stop = undefined;
    expect(mockListeners.size).toBe(0);
    expect(callbacks.size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
    expect(mockFetchText).not.toHaveBeenCalled();
  });
});
