import { breadcrumb, diagnosticContext } from "../diagnostics/client";
import { isSaveReady, setSaveReady, onSaveReady } from "../auth/saveReadiness";
import { AppState } from "react-native";
import { create } from "zustand";
import { AdCoordinator, type AdState } from "./coordinator";
import { createNativeAd, initializeAds, privacyChoices } from "./sdkAdapter";
import {
  grantCompletedReward,
  hasAdFree,
  prepareReward,
} from "./rewardService";
import { usePlayerStore } from "../../state/playerStore";
import { setAdAudioFocus } from "../audio/audioService";
import { levelAdBreak } from "./levelCadence";
let privacyBusy = false;
export function setAdsSaveReady(ready: boolean) {
  diagnosticContext({ saveReady: ready });
  setSaveReady(ready);
}
export const ads = new AdCoordinator({
  initialize: () => initializeAds(setAdAudioFocus),
  create: createNativeAd,
  now: Date.now,
  foreground: () =>
    AppState.currentState === "active" && !privacyBusy && isSaveReady(),
  adFree: hasAdFree,
  levelAdBreak,
  prepare: prepareReward,
  grant: grantCompletedReward,
  refresh: () => usePlayerStore.getState().hydrateFromStorage(),
  audio: setAdAudioFocus,
});
onSaveReady((ready) => {
  if (ready) ads.warm();
});
export const useAdStore = create<AdState>(() => ads.state);
ads.subscribe((state) => {
  const previous = useAdStore.getState();
  useAdStore.setState(state);
  if (previous.showing !== state.showing) {
    diagnosticContext({ adShowing: state.showing });
    breadcrumb(state.showing ? "ads.opened" : "ads.closed");
  }
});
export function startAds(): () => void {
  const timer = setTimeout(() => {
    ads.start();
  }, 1500);
  const listener = AppState.addEventListener("change", (state) => {
    if (state === "active" && !privacyBusy) {
      ads.start();
      ads.warm();
    }
  });
  return () => {
    clearTimeout(timer);
    listener.remove();
    ads.stop();
  };
}
export async function showAdPrivacy(): Promise<void> {
  if (ads.state.showing) return;
  privacyBusy = true;
  setAdAudioFocus(true);
  try {
    const info = await privacyChoices();
    ads.allow(info.allowed, info.privacyRequired);
  } finally {
    privacyBusy = false;
    setAdAudioFocus(false);
    ads.warm();
  }
}
