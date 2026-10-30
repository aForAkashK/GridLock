import { breadcrumb, diagnosticContext } from "../diagnostics/client";
import { Platform } from "react-native";
import configuration from "../../../ads.config.json";
import appConfiguration from "../../../app.json";
import type { AdKind, AdEvent, AdPort } from "./coordinator";
let sdk: typeof import("react-native-google-mobile-ads") | undefined;
export const TEST_ADS = configuration.mode === "test";
function units() {
  return Platform.OS === "ios" ? configuration.ios : configuration.android;
}
function configured() {
  if (TEST_ADS) return true;
  const app = appConfiguration["react-native-google-mobile-ads"];
  const appId = Platform.OS === "ios" ? app.ios_app_id : app.android_app_id;
  return (
    /^ca-app-pub-\d+~\d+$/.test(appId) &&
    !appId.includes("3940256099942544") &&
    Object.values(units()).every(
      (id) =>
        /^ca-app-pub-\d+\/\d+$/.test(id) && !id.includes("3940256099942544")
    )
  );
}
export async function initializeAds(
  dialogAudio: (paused: boolean) => void = () => {}
) {
  if (!configured()) throw new Error("Production AdMob IDs are missing");
  sdk = await import("react-native-google-mobile-ads");
  let info;
  try {
    info = await sdk.AdsConsent.requestInfoUpdate();
    if (info.isConsentFormAvailable && info.status === "REQUIRED") {
      dialogAudio(true);
      try {
        info = await sdk.AdsConsent.loadAndShowConsentFormIfRequired();
      } finally {
        dialogAudio(false);
      }
    }
  } catch {
    breadcrumb("ads.consent_unavailable");
    info = await sdk.AdsConsent.getConsentInfo();
    // Official sample-app IDs have no publisher UMP message. Test mode can
    // request only Google's dedicated non-personalized sample inventory.
    if (!TEST_ADS && !info.canRequestAds)
      return { allowed: false, privacyRequired: false };
  }
  if (!TEST_ADS && !info.canRequestAds)
    return {
      allowed: false,
      privacyRequired: info.privacyOptionsRequirementStatus === "REQUIRED",
    };
  await sdk
    .default()
    .setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.G });
  await sdk.default().initialize();
  return {
    allowed: true,
    privacyRequired: info.privacyOptionsRequirementStatus === "REQUIRED",
  };
}
export function createNativeAd(
  kind: AdKind,
  callback: (event: AdEvent) => void
): AdPort {
  if (!sdk) throw new Error("Ads SDK has not initialized");
  const notify = callback;
  callback = (event) => {
    breadcrumb(`ads.${kind}.${event}`);
    diagnosticContext({ adStatus: `${kind}_${event}` });
    notify(event);
  };
  const unit = TEST_ADS
    ? kind === "rewarded"
      ? sdk.TestIds.REWARDED
      : sdk.TestIds.INTERSTITIAL
    : units()[kind];
  const options = { requestNonPersonalizedAdsOnly: true };
  let ad:
    | import("react-native-google-mobile-ads").RewardedAd
    | import("react-native-google-mobile-ads").InterstitialAd;
  const off: (() => void)[] = [];
  if (kind === "rewarded") {
    const rewarded = sdk.RewardedAd.createForAdRequest(unit, options);
    off.push(
      rewarded.addAdEventListener(sdk.RewardedAdEventType.LOADED, () =>
        callback("loaded")
      ),
      rewarded.addAdEventListener(sdk.RewardedAdEventType.EARNED_REWARD, () =>
        callback("earned")
      ),
      rewarded.addAdEventListener(sdk.AdEventType.CLOSED, () =>
        callback("closed")
      ),
      rewarded.addAdEventListener(sdk.AdEventType.ERROR, (error) => {
        breadcrumb("ads.failure", { code: error.code });
        callback("error");
      })
    );
    ad = rewarded;
  } else {
    const interstitial = sdk.InterstitialAd.createForAdRequest(unit, options);
    off.push(
      interstitial.addAdEventListener(sdk.AdEventType.LOADED, () =>
        callback("loaded")
      ),
      interstitial.addAdEventListener(sdk.AdEventType.CLOSED, () =>
        callback("closed")
      ),
      interstitial.addAdEventListener(sdk.AdEventType.ERROR, (error) => {
        breadcrumb("ads.failure", { code: error.code });
        callback("error");
      })
    );
    ad = interstitial;
  }
  return {
    load: () => ad.load(),
    show: () => ad.show(),
    destroy: () => {
      off.forEach((fn) => fn());
      ad.destroy();
    },
  };
}
export async function privacyChoices() {
  if (!sdk) await initializeAds();
  if (!sdk) return { allowed: false, privacyRequired: false };
  const current = await sdk.AdsConsent.getConsentInfo();
  if (current.privacyOptionsRequirementStatus === "REQUIRED")
    await sdk.AdsConsent.showPrivacyOptionsForm();
  const info = await sdk.AdsConsent.getConsentInfo();
  return {
    allowed: TEST_ADS || info.canRequestAds,
    privacyRequired: info.privacyOptionsRequirementStatus === "REQUIRED",
  };
}
