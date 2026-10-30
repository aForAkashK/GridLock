# Ads and earned-coin ad-free passes

## Shipped implementation

- Rewarded coin ladder: 10,15,20,25,35,50 for the first six completed coin ads each device-local day, then10 for every further view. No daily viewing/claim cap. A quote is fixed when an already-loaded ad is shown; an ad spanning midnight retains that quote and belongs to its start day.
- A separate dedicated rewarded-ad route increments 24-hour pass progress. Five completed views activate24 rolling hours without forced level ads. These views grant no coins and do not advance the coin ladder. Partial progress persists across days/restarts. While any pass is active, further dedicated day-pass views are disabled; optional coin ads remain available.
- Seven days cost1,000 earned coins;30 days cost3,000. Confirmed coin purchases extend `max(now,current expiry)`. No real-money purchase/subscription or permanent-purchase UI is enabled.
- A preloaded interstitial is offered after every four completed real rounds when leaving results through Next/Replay/Home. Replayed wins count; skips and developer previews do not. The small device-local MMKV counter survives restart, is not cloud-synced, and resets when a result is left during an active ad-free pass. A missing/stale/failed/consent-blocked ad never delays navigation, and a missed fourth-round opportunity does not carry over to the very next round. No banners, app-open ads or mid-puzzle ads. No network loading is awaited on a tap.
- Home has a labelled gold Ad-Free shortcut next to Settings. It opens the existing Coins & Ad-Free screen with the five-view24-hour pass and1,000/3,000-coin offers; it never purchases or shows an ad by itself.

## Architecture

`policy.ts` is pure. `rewardService.ts` prepares a reward intent and grants only from the SDK earned callback. Daily counters, total dedicated-pass views, expiry, clock high-water and bounded receipt IDs travel together in the existing durable coin transaction. Each completed impression has one purpose and a unique receipt. Duplicate SDK callbacks/retries cannot repeat the local payout. Equip/skin scope is unchanged.

The existing player document syncs this normalized monetization snapshot. Merge same-day counters by maximum, retain the latest day, maximum pass totals/expiry/clock and union receipts. Never add balances. Startup, sync and explicit account recovery repair pending transactions BEFORE comparing cloud coin versions. Timed passes and counters are client-clock/client-authoritative, like the existing earned-coin economy; concurrent offline devices and modified clients are not globally fraud-proof. Trusted receipt/clock verification is required before real-money currency/premium sales.

`coordinator.ts` owns one rewarded and one interstitial instance. It preloads after consent and initial save reconciliation (so a restored pass is respected), expires cached inventory after55 minutes, bounds a pending load to20 seconds, refuses concurrent presentations, grants nothing on early close/error and resumes navigation/audio on close or show failure. A fresh retry/foreground/entry can request missing inventory. There is no polling/network wait on the renderer or per-frame store write. `sdkAdapter.ts` dynamically imports the SDK after the first screen; non-personalized ads and general-audience ad content rating are requested. This is not a declaration that the app is child-directed; configure actual target-audience settings in the stores and AdMob.

The app pauses its own music/SFX for a shown ad and resumes according to settings/foreground state. Ads do not take over the music preference. Consent/Privacy Choices pause audio only while their native form is open, not throughout a network load.

## Native dependency and startup

Pinned `react-native-google-mobile-ads@17.4.0`, compatible with RN0.87/New Architecture; no mediation packages. iOS static-framework override matches Firebase. `USE_FRAMEWORKS=static pod install` and native Android/iOS rebuilds are required.

GMA's resolved WorkManager2.7.0/Room2.2.5 consumer rules preserve `WorkDatabase_Impl` but omit its reflectively called public constructor under R8 full mode. The first minified smoke test crashed at this point. The app now keeps only that constructor (not an entire Room/ads package). WorkManager uses the documented on-demand `Configuration.Provider` initialization; its default startup initializer is removed so ads database creation stays off the first-screen path. The direct WorkManager coordinate exposes an already-present transitive API and adds no second runtime copy.

## Current configuration: TEST ONLY

`ads.config.json` has mode `test`. `app.json` contains the publisher's Android app ID and Google's iOS sample app ID. Both Android rewarded and interstitial units are saved. Only `TestIds.REWARDED/INTERSTITIAL` are requested, even if someone fills live unit fields in test mode. The sample app has no publisher consent-message configuration; the adapter tolerates that failure only in explicit test mode while requesting dedicated non-personalized test units. Production requires valid publisher app/unit IDs and UMP `canRequestAds`; it has no consent-error bypass.

- `npm run verify:ads-config`: validates current test/development configuration; runs in CI.
- `npm run verify:ads-release -- --platform android` (or ios): rejects test mode, Google sample IDs and absent production unit IDs. Expected to FAIL until the publisher sets up AdMob. Native compilation alone does not establish live-ad readiness.

## Publisher setup before release

1. Create the AdMob account/app entries under AksSoft for the actual app IDs. The current Android application ID is `com.akssoft.gridlock`. Suggested store-facing title: Freeway Escape: Traffic Puzzle; existing Home brand remains Freeway Escape.
2. Create rewarded and interstitial units on each shipping platform. Put app IDs in the corresponding `app.json` `react-native-google-mobile-ads` fields, unit IDs in `ads.config.json`, and switch mode to `production`. Rebuild native apps after app-ID changes.
3. Configure the applicable AdMob Privacy & messaging consent messages and actual audience settings. Settings exposes Ad privacy choices. Review Play Data Safety/App Store privacy forms against the SDK's disclosures and the public policy; non-personalized does not mean zero SDK data collection.
4. Register physical test devices or continue dedicated test units during development. Never manually click live ads to test. App-ads.txt, store linking, payment/identity/account approval and actual ad serving are publisher-console tasks; this repository does not create an approved revenue account.
5. Run the production config gate, refresh privacy/support pages, exercise no-fill/offline, short/complete rewarded views, pass expiry, account restore, and an internal-track production-signed build on real hardware before public rollout.

## Verification boundaries

Unit tests cover the full ladder, midnight, backward/invalid clocks, five-ad separation, duplicate callbacks/receipts, interruptions at every persistence step, pass extension/duplicate purchase, consent/no-fill/show failure, cached-ad suppression after a pass and cloud merge ordering. Native Android QA uses actual Google test ads and retains the user's existing save. Android publisher app/rewarded/interstitial IDs are saved; publisher-console acceptance and production activation remain outstanding. No live revenue or real-money flow is claimed.

Primary integration references:
- https://docs.page/invertase/react-native-google-mobile-ads
- https://developers.google.com/admob/android/interstitial
- https://developer.android.com/develop/background-work/background-tasks/persistent/configuration/custom-configuration
- https://developers.google.com/admob/android/privacy/play-data-disclosure
- https://developers.google.com/admob/ios/privacy/data-disclosure

Native evidence: Android performance and signed release builds succeeded after the R8 constructor/on-demand WorkManager fix; iOS simulator native build succeeded with GADApplicationIdentifier injected from app.json. Google test rewarded ad credited10 coins, followed by a15-coin offer. A replayed Level1 win showed an interstitial on Next and closing opened Level2. Crossing midnight reset the next coin offer to10 while dedicated day-pass progress remained saved. Production readiness gate remains intentionally failing until publisher configuration is supplied.

Ad presentation is additionally gated by initial save reconciliation and explicit account-restore readiness, preventing forced ads from outrunning a restored pass. Save readiness has no SDK dependency, and a successful retry of explicit restore reopens the gate.

Five actual dedicated rewarded test ads completed successfully: progress1–4 remained saved across midnight and a native app restart; the fifth activated a24-hour expiry. Coin balance stayed640 throughout those five pass views. The coin-reward route remained available during the pass.


Four-round pacing update (2026-10-30): `levelCadence.ts` persists a bounded local count via `player.levelAdBreaks.v1`, included in normal account-data deletion and excluded from currency/cloud snapshots. `nextLevelAdBreak` is pure policy; the coordinator applies it only on eligible foreground result departures and refuses an extra forced ad on a storage failure. Optional rewarded ads use their existing independent path. Tests exercise two complete four-round cycles, restart persistence, missing inventory, active passes, invalid stored counts, save failure and background/concurrent-ad exclusion. Home shortcut/native destination checked at normal393×851dp and compact360×640dp/150% text. No claims, purchases or player progress changes performed.
