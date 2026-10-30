# Rendering and asset management — 2026-10-26

## Changes

- Vehicle shadows are baked once into four shared CPU-backed Skia images for 1×2,2×1,1×3,3×1 footprints, then uploaded/reused as textures. The supported campaign avoids per-vehicle BlurMask processing during animation. A fallback retains the original shadow when allocation fails or a future footprint is unsupported. Cached images consume about 0.99MiB of RGBA pixels total, excluding GPU/driver overhead.
- VehicleSprite uses React.memo. The pure engine retains unmoved vehicle references, while layout and decoded images stay stable, so a move no longer requires JS work for every unchanged vehicle. GameBoard also avoids rerendering on unrelated coin/panel updates. Motion still uses Reanimated shared values on the UI thread.
- Existing sprite loading is on demand with concurrent-request deduplication and a fixed 21-sprite cache. No new all-at-once preload, speculative next-level decode, background asset download or runtime synthesis was added.
- `npm run audit:assets` measures static imports and decoded pixel estimates, validates WebP headers without third-party decoders, enforces budgets and compares native audio copies. CI runs it on every change. Editable source PNGs and listening-only audio previews are outside runtime imports.

## Current budgets / measured inventory

42 imported WebP files,1.92MiB encoded total. All imported images together represent43.48MiB of RGBA pixels; this is an inventory estimate, not simultaneous residency or measured process RAM. Four backdrops each represent about6MiB decoded. Full21-sprite registry: 10.40MiB decoded; a level loads only its required keys. Shipped audio: 362KiB (compressed BGM plus preloaded PCM cues).

Limits: 4MiB total imported artwork; 512KiB per encoded image; 2048px maximum edge; 6.5MiB per decoded image; 1.5MiB per UI texture; 768KiB per vehicle texture; 12MiB full vehicle registry. BGM 384KiB, each cue 64KiB. Review budgets deliberately when adding packs; do not silently raise them to make CI pass.

## Physical-device acceptance

Use a release/internal-test build rather than Metro/debug for timing. Exercise 6×6, 7×7 and 8×8; repeated restarts and Next; rapid exits followed by Undo; hint glow; app background/resume; and repeated Home/Levels/Game navigation. Check frames, memory plateau, thermal/battery behavior, startup, sound balance and loading on the user's real phone. Capture model/OS/build plus the exact scenario when reporting a hitch. Emulator statistics cannot establish a 60fps or battery-performance claim, and no physical-device speedup percentage is claimed here.

## Emulator check

Minified QA build rendered the cached shadows correctly on 8×8 and cleared level 80 in 13 real emulator taps. Android gfxinfo recorded 106 UI frames, median 21ms, p90 46ms, p95 57ms, 97.17% missed deadlines (legacy 34.91%). This is still not a smoothness pass. It is a different run/scenario from earlier measurements, so no before/after speedup percentage is inferred. Final code passes 609 tests,TypeScript,lint,100-level validation and asset budgets. Signed Android bundle builds successfully.

## Phone test APK

Build `cd android && ./gradlew :app:assemblePerformance`. The resulting `app/build/outputs/apk/performance/app-performance.apk` embeds the bundle and minifies native/JS code, disables debugging and QA previews, and uses the local debug certificate so a matching development install can be updated without losing its save. It runs without Metro. This APK is for local testing only; the production AAB retains upload signing. Never uninstall to bypass a signing mismatch without protecting progress first.

The phone-test APK built successfully and installed as an update on the emulator. Generated BuildConfig confirms DEBUG=false and QA_ENABLED=false. A preview_level80 launch intent is ignored; normal Home/Continue controls are present. No physical-device install was performed by the agent.

Daily UI update: use the user-requested clean Levels background variant (`city_bg.webp`) plus a55KB transparent header. Inventory is now44 images,2.19MiB encoded,50.60MiB aggregate RGBA estimate. A single static Daily canvas paints the panel/tile bevels; native labels and claim controls remain live. Reward values and save logic are unchanged by the visual refresh.

Android bundle tasks clear only their generated Metro drawable output when bundling runs. This prevents removed imports from leaving stale image files in incremental release packages. Packaged artifact verification confirms the superseded Daily city concept is absent.
