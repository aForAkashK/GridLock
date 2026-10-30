# First release readiness — 2026-10-26

Developer: **AksSoft**. Public support: https://portfolio-akash-kr.vercel.app/

## Implemented

- 100 bundled, solver-validated levels work offline from installation. Levels 1–59 use 6×6, 60–79 use 7×7, 80–100 use 8×8.
- Show levels 1–50 initially; reveal the next 50 after completing the first group. Continue, Next and direct navigation share the same progression gate. Paid Skip retains existing completion semantics.
- Preserve published levels 51–55. Legacy v1 delivery stays available; this app uses v2 with bundled base 100 and future additions starting at 101. No generation backend is required.
- Dynamic Skia grid, cached on-demand sprite decoding, virtualized level selection, independent exit animation cleanup, reduced motion and screen-reader vehicle controls.
- Native preloaded sound and haptics, settings controls, free restart and matching FREE button art.
- Optional Google account linking/recovery, explicit existing-save confirmation, durable retry after an offline restore, cloud coin balance precedence and unioned progress. Gameplay taps remain local and synchronous.
- Android upload signing configured with an ignored private key; release minification enabled. Native feedback and OAuth changes require a native rebuild.
- CI checks typecheck, lint, tests, level validation, both delivery channels and hint benchmarks.
- WebP home assets, launcher icons, privacy/support pages and release documentation.

## Verified evidence

Latest review (2026-10-29): **764 tests**, TypeScript/lint, all100 level validations, asset budgets and Android QA/performance/signed release builds pass. Main-screen native review and compact/enlarged-text fixes are recorded in [the review report](release/QA_REVIEW_2026-10-29.md). Physical-device/iOS acceptance remains open. Earlier dated measurements below are historical.

- 603 Jest tests pass, including progression, delivery, restore failure/retry and rapid exit cleanup.
- All 100 boards pass geometry, exact par and solvability validation.
- Node hint benchmark worst sampled 1.35ms in the recorded run; this is not a physical-device measurement.
- iOS simulator native build succeeded; no Apple distribution signing was attempted.
- Minified standalone Android QA APK: cold-started offline, rendered 7×7 and 8×8 correctly, and solved levels60/80/100 with real taps (12/13/15 moves). Normal development app restored afterward; save remains360 coins,15 completed,current16.
- Signed Android AAB built successfully; `jarsigner -verify` reports jar verified (normal self-signed upload certificate).
- Final iOS simulator native build succeeded again after configuration/icon changes.
- Both live feed contracts verified; v1 puzzles remain unchanged. Actual app transport parses v2/base100. Privacy/support pages return HTTP200.
- Emulator profiling during level100 recorded105 Android UI frames, median27ms,p90 53ms,95.24% missed frame deadlines (legacy jank34.29%). This is not a smooth-performance acceptance pass; host emulation/build load and Skia's separate surface limit interpretation. Physical-device profiling remains required.

## Remaining acceptance before public launch

- Human difficulty/playtesting across the full campaign; solver validation alone cannot establish fun or difficulty.
- Interactive Google account selection and restore with a real account on Android and iOS.
- Physical-device performance, small screens, VoiceOver/TalkBack, sound and haptic quality, and reduced-motion acceptance.
- Store console setup, Play app-signing SHA registration, screenshots/listing review, Apple distribution signing, and store submission.
- Back up the private upload key and signing properties outside this checkout; never commit them.
- Review privacy declarations and support/delete-request handling against the actual store forms.

Daily rewards are implemented; Awards are implemented; Shop offers Red Racer for earned coins, Inventory and local Coin History. Real-money purchases, custom analytics and backend generation are outside this release. Ads and coin-funded passes are implemented in test mode; production AdMob setup is still required. Do not describe stubs as shipping features or sell client-authoritative coins.

Release outputs: `android/app/build/outputs/bundle/release/app-release.aab`; actual board captures in `release/screenshots/`; listing draft in `release/STORE_LISTING.md`; residual build-tool advisory in `release/DEPENDENCY_REVIEW.md`.

Audio update: original cartoon cues and250KB native-looped BGM added with independent music toggle/volume.606 tests, TypeScript/lint and both native builds pass. Android emulator confirms music paused in background and resumed at28% on foreground with one player reused. Human listening approval and physical-device interruption/headphone acceptance remain pending.

Daily economy update: increasing 7-step daily claims with missed-day reset, local-midnight rollover, duplicate protection and interrupted-write recovery. Receipt metadata syncs/reconciles with cloud saves. Ad reward50/limit3 and skin prices300/900/1800 are planned configuration only; no ads or real-money purchase is enabled. Red Racer now uses the standard 300-coin price.

Daily presentation now matches the user-provided cartoon reference: clean Levels city variant without its title,transparent55KB calendar header,glossy blue frame and live4+3 reward tiles. Original Levels art remains unchanged.629 tests,TypeScript,lint,asset budgets and Android test/release builds pass; final claimed-state screen checked on emulator. Ad rewards and additional skin tiers remain planned configuration only.

Typography update (2026-10-27): Daily display text now uses bundled43KB Fredoka One; gold collected-button text is dark blue and the green claim label is dark green,with no blurred shadow. Button shape is unchanged for this font-first iteration. Android emulator visual check,629 tests,TypeScript/lint,asset audits and Android/iOS builds pass. Native rebuild required to include the font; the phone-test APK is refreshed.

Back navigation update (2026-10-27): all five non-root screens use the shared48-point glossy Back button,derived from the Home settings icon.11KB WebP,consistent hit slop/press state/accessibility.629 tests,TypeScript/lint,asset budgets and Android test/release builds pass. Original Home settings artwork is unchanged.

Public publisher identity: Developed by AksSoft. Settings and public support/privacy pages link to `https://portfolio-akash-kr.vercel.app/`. Personal developer credit removed; the portfolio URL remains the requested public contact/profile link.629 tests,TypeScript/lint and Android test/release builds pass.


Ads update (2026-10-28): all four monetization features are implemented with native Google test ads. Reward ladder10/15/20/25/35/50 then10; five separate ads give24-hour ad-free;7-day/30-day coin passes1000/3000. Missing ads never block level navigation. See ADS.md. Before public release, configure actual AdMob account/app/unit IDs and consent messages, update store privacy/Contains Ads declarations and pass `npm run verify:ads-release -- --platform android`. Android publisher app/rewarded/interstitial IDs are saved. The gate still fails because test mode remains enabled, per the publisher’s decision to activate production ads after publishing and verification. Native build/test success does not mean live revenue is enabled. No real-money purchases added.


Settings/deletion update (2026-10-29): consistent padded Settings sections and wrapping legal/support links, with public support email akssoft.feedback@gmail.com. Dedicated deletion-request instructions at https://gridlock-bee41-levels.web.app/delete-account.html and updated privacy/support pages are deployed. This is a manual email request path, not automatic deletion; the publisher must monitor/process verified requests using release/ACCOUNT_DELETION.md. No account was deleted in verification.

Direct deletion update (2026-10-29): Settings now provides actual in-app account/cloud-save/local-data deletion after confirmation and identity verification. Durable retries and an immutable server UID/time security marker prevent stale-session save recreation. The public page remains an email fallback, not the only in-app path. Marker retention is explicitly disclosed.753 Jest tests and isolated Firebase Auth/Firestore checks pass. Human Google-account acceptance must use a disposable account; do not delete the publisher's save.


Physical sound correction (2026-10-30): Samsung SM-S938B testing found effects incorrectly on the muted system-sound stream, while BGM used media/game audio. SoundPool now uses USAGE_GAME; the rebuilt app is installed on the phone and diagnostics confirm the new attributes without changing system mute/volume or haptics.764 tests,TypeScript/lint,performance APK and signed AAB pass. The user confirmed sound effects work on the physical phone after the update. See D-028.


Special-vehicle clarity update (2026-10-30): the user authorized matching generated replacements for the blurry police,ambulance and taxi. All three now use243×512 transparent WebPs, with1821px masters and prompt provenance retained separately. A512px minimum-resolution audit now supplements size budgets. Native6×6/8×8 QA boards show all three clearly;764 tests,TypeScript/lint,asset audit and Android builds pass. Net encoded growth87.6KiB; full decoded sprite registry12.02MiB under the revised12.25MiB ceiling. Physical-phone confirmation awaits reconnection.


Ad pacing/Home update (2026-10-30): level interstitials now have one opportunity every four completed real rounds, retained across restart, with no catch-up after unavailable inventory. Passes/skips/QA preview remain exempt; rewarded ads are unchanged. Home's gold Ad-Free button opens the existing day/coin-pass offers. TypeScript/lint,778 tests,asset budgets and Android QA/performance/signed release builds pass; shortcut/destination checked natively at normal and compact150% text. No purchases, rewards or gameplay progress modified. Actual forced-ad cycling was verified with coordinator tests rather than overriding the emulator's active pass. Production activation remains deferred.


Physical UI fixes (2026-10-30): native win Modal replaces the in-screen overlay; inventory native controls and Skia backgrounds share explicit frames. Connected OnePlus NE2211 verified Level15 popup after9 preview moves,Replay and aligned car/truck/bus cards at the device's original1440×3216/density640/font0.9 settings. Normal ARM64 build is installed;100-coin/level1 save preserved. TypeScript/lint,789 tests,asset audit,ARM64 QA/performance APKs and full signed AAB pass. See release/QA_DEVICE_FIX_2026-10-30.md.
