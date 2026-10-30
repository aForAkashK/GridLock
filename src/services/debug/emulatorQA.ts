/** Development-only emulator hooks. Never expose auth data or mutate player saves. */
import { spriteDiagnostics } from '../../game/rendering/sprites';
import { NativeModules, PixelRatio } from 'react-native';
import { useGameStore } from '../../state/gameStore';
import { usePlayerStore } from '../../state/playerStore';
import { computeHint } from '../../game/engine/hint';
import type { RootStackParamList } from '../../navigation/types';

type Board = { left: number; top: number; size: number; gridSize: number };
let board: Board | null = null;
let lastGeometry = '';
export function canUseEmulatorQA(): boolean { return __DEV__ || NativeModules.GridLockFeedback?.qaEnabled === true; }
export function recordQAMetric(name: string, value: unknown): void {
  if (NativeModules.GridLockFeedback?.qaEnabled === true) { NativeModules.GridLockFeedback.recordQA(name, JSON.stringify(value)); }
}
export function recordQABoard(value: Board): void {
  if (canUseEmulatorQA()) {
    board = value;
    const geometry = JSON.stringify(value);
    if (geometry !== lastGeometry) { lastGeometry = geometry; recordQAMetric('board', value); }
  }
}
export function installEmulatorQA(open: (levelId: number) => void): void {
  if (!canUseEmulatorQA()) {
    return;
  }
  const api = {
    preview: (levelId: number) => {
      if (Number.isInteger(levelId) && levelId >= 1 && levelId <= 100) {
        open(levelId);
      }
    },
    sprites: () => ({
      ...spriteDiagnostics(),
      components: (globalThis as typeof globalThis & { __SPRITE_STATE__?: unknown }).__SPRITE_STATE__,
      board: (
        globalThis as typeof globalThis & { __BOARD_DIAGNOSTICS__?: unknown }
      ).__BOARD_DIAGNOSTICS__,
    }),
    snapshot: () => {
      const game = useGameStore.getState();
      const player = usePlayerStore.getState();
      return {
        levelId: game.level?.id,
        status: game.state?.status,
        moveCount: game.state?.moveCount,
        pixelRatio: PixelRatio.get(),
        vehicles: game.state?.vehicles.length,
        history: game.history.length,
        board,
        coins: player.coins,
        completed: player.completedLevels.length,
        currentLevel: player.currentLevel,
      };
    },
    nextMove: () => {
      const state = useGameStore.getState().state;
      if (!state || !board) {
        return null;
      }
      const hint = computeHint(state);
      const vehicle = state.vehicles.find(
        (item) => item.id === hint?.vehicleId,
      );
      if (!vehicle) {
        return null;
      }
      return {
        vehicleId: vehicle.id,
        x:
          board.left +
          ((vehicle.x + vehicle.width / 2) * board.size) / board.gridSize,
        y:
          board.top +
          ((vehicle.y + vehicle.height / 2) * board.size) / board.gridSize,
      };
    },
    benchmarkHint: () => {
      const state = useGameStore.getState().state;
      if (!state) {
        return null;
      }
      const start = performance.now();
      const hint = computeHint(state);
      return {
        ms: performance.now() - start,
        found: Boolean(hint),
        level: state.levelId,
      };
    },
  };
  (
    globalThis as typeof globalThis & { __GRIDLOCK_QA__?: typeof api }
  ).__GRIDLOCK_QA__ = api;
}
export type PreviewRoute = RootStackParamList['Game'];
