# Real-device UI fixes — 2026-10-30

The win panel now uses a real transparent native Modal above the game surface. It retains the400ms reveal delay, fits its existing artwork, and dismisses before result navigation or interstitial presentation. Android dismissal is unanimated with a one-frame handoff; iOS uses onDismiss. Repeated taps cannot consume results twice. Pending reveal/frame work is cancelled on reset/unmount.

Inventory no longer flex-wraps its foreground independently of the painted cards. Both consume shared explicit frames, so all six items keep their intended three-column positions (or two columns at compact/large-text settings). Equipment rules, coins and artwork are unchanged.

## Physical verification

Connected OnePlus NE2211,1440×3216,original density override640 and font scale0.9; no phone display settings changed.

- QA Level15 preview solved with9 real taps; native popup visible with Next/Replay/Home and correct stats. Replay closes it and restores the board.
- Normal updated ARM64 APK restored, Inventory inspected for cars,trucks and buses. All six items align with matching backgrounds; no equipment changed.
- Original100 coins,zero completed levels and level1 remain intact. Preview did not award or spend currency.
- Phone left on Home in the normal build. No purchase,claim,account deletion or forced ad was performed.

## Verification

TypeScript and ESLint pass;789 tests in36 suites pass. New regressions cover native reveal/reset,reward-prop rerenders,duplicate action suppression,iOS dismissal ordering and fractional/large-text inventory frames. Asset budgets remain unchanged. ARM64 QA/performance builds and the full multi-architecture release AAB succeed; jarsigner verifies the AAB. Actual iOS device presentation remains outside this Android hardware check.

Updated installer: android/app/build/outputs/apk/performance/app-performance-arm64.apk (48.4MB). Source screenshots: release/screenshots/device-ui-2026-10-30/.
