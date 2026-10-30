import { diagnosticContext, reportIssue } from "../diagnostics/client";
/** Native-preloaded cartoon cues and a compressed, native-looped music bed. */
import { AppState, NativeModules } from "react-native";
import { useSettingsStore } from "../../state/settingsStore";

export type Sfx = "move" | "blocked" | "exit" | "win" | "coin" | "tap";
type FeedbackNative = {
  preload: () => Promise<boolean>;
  play: (name: Sfx) => void;
  haptic: (kind: string) => void;
  setMusic?: (enabled: boolean, volume: number) => void;
};
const native = NativeModules.GridLockFeedback as FeedbackNative | undefined;
let loading: Promise<void> | null = null;
let ready = false;
export function preloadAll(): Promise<void> {
  if (loading) {
    return loading;
  }
  loading = (native ? native.preload() : Promise.resolve(false))
    .then((value) => {
      ready = value;
      diagnosticContext({ audioReady: value, nativeFeedback: Boolean(native) });
    })
    .catch((error) => {
      reportIssue("audio.preload", error);
      loading = null;
      if (__DEV__) {
        console.warn("[audio] preload unavailable:", String(error));
      }
    });
  return loading;
}
let adAudioPaused = false;
let refreshMusic: (() => void) | null = null;
export function setAdAudioFocus(paused: boolean) {
  adAudioPaused = paused;
  refreshMusic?.();
}
export function play(sfx: Sfx): void {
  if (adAudioPaused) return;
  const settings = useSettingsStore.getState();
  if (settings.soundEnabled && ready) {
    native?.play(sfx);
  }
  if (
    settings.hapticsEnabled &&
    ["blocked", "exit", "win", "tap"].includes(sfx)
  ) {
    native?.haptic(sfx);
  }
}

/** No timers or JS frame callbacks. Native players own decoding and looping. */
export function startAudio(): () => void {
  let foreground = AppState.currentState === "active";
  const apply = () => {
    const settings = useSettingsStore.getState();
    native?.setMusic?.(
      foreground && !adAudioPaused && settings.musicEnabled,
      settings.musicVolume
    );
  };
  refreshMusic = apply;
  apply();
  preloadAll();
  const unsubscribe = useSettingsStore.subscribe((next, previous) => {
    if (
      next.musicEnabled !== previous.musicEnabled ||
      next.musicVolume !== previous.musicVolume
    ) {
      apply();
    }
  });
  const listener = AppState.addEventListener("change", (state) => {
    foreground = state === "active";
    apply();
  });
  return () => {
    refreshMusic = null;
    unsubscribe();
    listener.remove();
    native?.setMusic?.(false, 0);
  };
}
