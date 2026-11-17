/** Generates and installs one complete batch at a time outside active gameplay. */
import { AppState } from "react-native";
import { useGameStore } from "../../state/gameStore";
import {
  appendLevels,
  useLevelCatalogStore,
} from "../../state/levelCatalogStore";
import { usePlayerStore } from "../../state/playerStore";
import { buildEndlessBatch } from "../../game/levels/endless";
import { nextBatchTarget } from "../../game/levels/endlessPolicy";
import { reportIssue } from "../diagnostics/client";

const idle = globalThis as typeof globalThis & {
  requestIdleCallback: (callback: () => void) => number;
  cancelIdleCallback: (handle: number) => void;
};

let gameVisible = false;
let wake: (() => void) | undefined;

export function setEndlessGameVisible(visible: boolean): void {
  gameVisible = visible;
  wake?.();
}

export function startEndlessLevels(): () => void {
  let foreground =
    AppState.currentState !== "background" &&
    AppState.currentState !== "inactive";
  let scheduled: number | undefined;
  let target = nextBatchTarget(usePlayerStore.getState().completedLevels);
  const lastLevel = () => useLevelCatalogStore.getState().levels.at(-1)!.id;
  const canRun = () =>
    foreground &&
    (!gameVisible || useGameStore.getState().state?.status === "won") &&
    lastLevel() < target;

  function schedule(): void {
    if (scheduled === undefined && canRun()) {
      scheduled = idle.requestIdleCallback(run);
    }
  }

  function run(): void {
    scheduled = undefined;
    if (!canRun()) return;
    try {
      appendLevels(buildEndlessBatch(lastLevel()));
    } catch (error) {
      reportIssue("levels.generate", error);
      return;
    }
    schedule();
  }

  wake = schedule;
  const app = AppState.addEventListener("change", (state) => {
    foreground = state === "active";
    schedule();
  });
  const unsubscribeGame = useGameStore.subscribe((state, previous) => {
    if (state.state?.status === "won" && previous.state?.status !== "won")
      schedule();
  });
  const unsubscribePlayer = usePlayerStore.subscribe((state, previous) => {
    if (state.completedLevels !== previous.completedLevels) {
      target = nextBatchTarget(state.completedLevels);
      schedule();
    }
  });
  schedule();
  return () => {
    if (wake === schedule) wake = undefined;
    if (scheduled !== undefined) idle.cancelIdleCallback(scheduled);
    app.remove();
    unsubscribeGame();
    unsubscribePlayer();
  };
}
