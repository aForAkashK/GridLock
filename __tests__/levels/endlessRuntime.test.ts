import { AppState } from "react-native";
import { LEVELS } from "../../src/game/levels";
import { useGameStore } from "../../src/state/gameStore";
import { useLevelCatalogStore } from "../../src/state/levelCatalogStore";
import { usePlayerStore } from "../../src/state/playerStore";
import {
  setEndlessGameVisible,
  startEndlessLevels,
} from "../../src/services/levels/endlessRuntime";

const mockForegroundListeners = new Set<(state: string) => void>();
jest.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (_event: string, onChange: (state: string) => void) => {
      mockForegroundListeners.add(onChange);
      return { remove: () => mockForegroundListeners.delete(onChange) };
    },
  },
}));
jest.mock("../../src/services/audio/audioService", () => ({ play: jest.fn() }));
jest.mock("../../src/state/playerStore", () => ({
  usePlayerStore: require("zustand").create(() => ({ completedLevels: [] })),
}));

const callbacks = new Map<number, () => void>();
let handle = 0;
let stop: () => void;
function drainIdle() {
  while (callbacks.size > 0) {
    const [id, run] = callbacks.entries().next().value!;
    callbacks.delete(id);
    run();
  }
}
function progress(last: number) {
  usePlayerStore.setState({
    completedLevels: Array.from({ length: last }, (_, i) => i + 1),
  });
}

beforeEach(() => {
  setEndlessGameVisible(false);
  useLevelCatalogStore.setState({ levels: LEVELS });
  useGameStore.getState().loadLevel(LEVELS[0]);
  progress(0);
  AppState.currentState = "active";
  Object.assign(globalThis, {
    requestIdleCallback: (run: () => void) => {
      callbacks.set(++handle, run);
      return handle;
    },
    cancelIdleCallback: (id: number) => callbacks.delete(id),
  });
  stop = startEndlessLevels();
});

afterEach(() => {
  stop();
  expect(callbacks.size).toBe(0);
  expect(mockForegroundListeners.size).toBe(0);
});

it("responds to progress changes during idle and preserves loaded board state", () => {
  setEndlessGameVisible(true);
  progress(99);
  drainIdle();
  expect(useLevelCatalogStore.getState().levels).toHaveLength(100);

  useGameStore.getState().skip();
  const played = useGameStore.getState().state;
  drainIdle();
  const first = useLevelCatalogStore.getState().levels;
  expect(first).toHaveLength(120);
  expect(useGameStore.getState().state).toBe(played);
  progress(119);
  drainIdle();
  const second = useLevelCatalogStore.getState().levels;
  expect(second).toHaveLength(140);
  expect(second[100]).toBe(first[100]);
});

it("catches up after cloud restore but waits while backgrounded", () => {
  mockForegroundListeners.forEach((callback) => callback("background"));
  progress(140);
  drainIdle();
  expect(useLevelCatalogStore.getState().levels).toHaveLength(100);
  mockForegroundListeners.forEach((callback) => callback("active"));
  drainIdle();
  expect(useLevelCatalogStore.getState().levels).toHaveLength(160);
});
