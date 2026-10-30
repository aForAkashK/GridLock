import { AppState, Image, NativeModules } from "react-native";

// Deliberately bounded: three destination backgrounds and two small headers.
// Home is already decoded by the time this starts. No full-library preload.
const sources = [
  require("../../../assets/ui/bg/city_bg.webp"),
  require("../../../assets/ui/bg/gameplay_bg.webp"),
  require("../../../assets/ui/bg/levels_bg.webp"),
  require("../../../assets/ui/daily/header.webp"),
  require("../../../assets/ui/shop/header.webp"),
  require("../../../assets/ui/icons/back.webp"),
];
let warming: Promise<void> | undefined;
/** Native decoded-cache warming, not Image.prefetch's disk/download cache. */
export function warmMenuAssets(shouldContinue = () => true): Promise<void> {
  if (warming) return warming;
  const native = NativeModules.GridLockAssets as
    | { warmLocalImage: (uri: string) => Promise<boolean> }
    | undefined;
  if (!native) return Promise.resolve();
  warming = (async () => {
    for (const source of sources) {
      if (!shouldContinue() || AppState.currentState !== "active") break;
      const resolved = Image.resolveAssetSource(source);
      if (resolved) await native.warmLocalImage(resolved.uri);
    }
  })()
    .catch(() => {
      // Cache warming is optional; native Image still handles normal loading.
    })
    .finally(() => {
      warming = undefined;
    });
  return warming;
}
