/**
 * Game store — state for the level currently being played.
 *
 * Deliberately separate from playerStore so that a board update (which happens
 * on every swipe) never re-renders the coin HUD, and vice versa.
 *
 * Note on the render path: the board is drawn by Skia and animated on the UI
 * thread via Reanimated. This store holds the LOGICAL board only. Per-frame
 * animation values must never live here — a Zustand write per frame would put
 * the JS thread on the critical path and cost frames. See ARCHITECTURE.md.
 */

import { create } from 'zustand';
import { computeHint, type Hint } from '../game/engine/hint';
import { applyMove } from '../game/engine/movement';
import { popHistory, pushHistory } from '../game/engine/undo';
import { createInitialState, type GameState } from '../game/models/GameState';
import type { Level } from '../game/models/Level';

type GameStoreState = {
  level: Level | null;
  state: GameState | null;
  history: GameState[];
  hintVehicleId: string | null;
  /**
   * Bumped whenever a tap resolves to no movement. The renderer watches this
   * to play the blocked shake — a blocked tap is feedback, not an error
   * (GAME_DESIGN.md), so it must be observable even though nothing changed.
   */
  blockedAt: number;
  blockedVehicleId: string | null;
  /**
   * True when the board was cleared by paying to Skip rather than by solving.
   * The level still counts as complete (it unlocks the next one) but must not
   * pay the completion reward — otherwise Skip costs a net 90 instead of 100,
   * and on a cheap level it would be a way to *earn* by not playing.
   */
  skipped: boolean;

  loadLevel: (level: Level) => void;
  moveVehicle: (vehicleId: string) => void;
  undo: () => void;
  reset: () => void;
  /**
   * Runs the solver from the CURRENT board and highlights the first move of
   * the shortest remaining solution. Returns null when the board is
   * unsolvable from here — callers must not charge for that.
   */
  revealHint: () => Hint | null;
  clearHint: () => void;
  /** Marks the level solved outright. Used by Skip, which the player pays for. */
  skip: () => void;
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  level: null,
  state: null,
  history: [],
  hintVehicleId: null,
  blockedAt: 0,
  blockedVehicleId: null,
  skipped: false,

  loadLevel: level => {
    set({
      level,
      state: createInitialState(level),
      history: [],
      hintVehicleId: null,
      blockedAt: 0,
      blockedVehicleId: null,
      skipped: false,
    });
  },

  moveVehicle: vehicleId => {
    const { state, history } = get();
    if (!state || state.status === 'won') {
      return;
    }

    const result = applyMove(state, vehicleId);
    if (result.move === null) {
      // Blocked. applyMove returns the same state reference, so there is
      // nothing to commit — only feedback to trigger.
      set({ blockedAt: Date.now(), blockedVehicleId: vehicleId });
      return;
    }

    set({
      state: result.state,
      history: pushHistory(history, state),
      hintVehicleId: null,
    });
  },

  undo: () => {
    const popped = popHistory(get().history);
    if (!popped) {
      return;
    }
    set({ state: popped.state, history: popped.history, hintVehicleId: null });
  },

  reset: () => {
    const { level } = get();
    if (!level) {
      return;
    }
    set({
      state: createInitialState(level),
      history: [],
      hintVehicleId: null,
      skipped: false,
    });
  },

  revealHint: () => {
    const { state } = get();
    if (!state || state.status === 'won') {
      return null;
    }
    const hint = computeHint(state);
    if (!hint) {
      return null;
    }
    set({ hintVehicleId: hint.vehicleId });
    return hint;
  },

  clearHint: () => set({ hintVehicleId: null }),

  skip: () => {
    const { state } = get();
    if (!state) {
      return;
    }
    // Clearing the board is what 'won' means, so Skip empties it rather than
    // setting a flag the engine would then have to know about.
    set({
      state: { ...state, vehicles: [], status: 'won' },
      hintVehicleId: null,
      skipped: true,
    });
  },
}));
