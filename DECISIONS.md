# Architecture Decision Record

Why things are the way they are. Each entry is dated and immutable — if a
decision changes, add a new entry that supersedes it rather than editing the
old one. The reasoning is the valuable part, not the conclusion.

---

## D-001 — React Native + Skia for the board

**Date:** 2026-09-05 · **Status:** Accepted

**Decision.** Game board rendered with `@shopify/react-native-skia`. UI chrome
(menus, HUD, modals) stays in ordinary React Native views.

**Why.** The board needs custom drawing, soft shadows, particles and 60fps
movement. Doing that with RN views means a `<View>` per vehicle with animated
transforms — workable for six vehicles, but it degrades as boards get dense and
gives no path to particles or shaped shadows. Skia draws to a single canvas on
the GPU and keeps the whole board to one native view.

**Rejected.** Unity or a full game engine — vastly heavier than a grid puzzle
needs, and it would put the menus, store integration and Firebase work into a
much less pleasant toolchain. Plain RN views — fine for MVP, but a rewrite is
guaranteed the moment effects arrive.

**Consequence.** Everything drawn inside the canvas is invisible to RN's layout
and accessibility systems. Anything that must be tappable by a screen reader
belongs outside the canvas.

---

## D-002 — Zustand, with the board split from the player

**Date:** 2026-09-05 · **Status:** Accepted

**Decision.** Zustand for state, split into three stores: `gameStore` (the
board), `playerStore` (coins, progress) and `settingsStore`.

**Why Zustand.** No context provider, so a state read does not re-render a
subtree. Selector subscriptions mean a component re-renders only when the exact
value it reads changes. Redux brings a lot of ceremony for a game with one
screen that matters, and Context re-renders every consumer on every change.

**Why the split.** A swipe updates the board several times per second. If coins
and board shared a store, every swipe would re-render the coin HUD. Separate
stores make that structurally impossible rather than a discipline problem.

**Hard constraint.** Per-frame animation values must never enter a store.
Zustand writes run on the JS thread; a write per frame puts JS on the critical
path and drops frames. Animation lives in Reanimated shared values on the UI
thread. The store holds the logical board only — where a vehicle *is*, never
where it is *mid-flight*.

---

## D-003 — Anonymous-first auth with a recovery ladder

**Date:** 2026-09-05 · **Status:** Accepted

**Decision.** Firebase Anonymous Auth at first launch. No login screen. A real
account is offered later, purely to protect progress.

**Why.** A casual puzzle game cannot afford a sign-in wall at level 1. The
player should be swiping within a second of opening the app.

**The problem this creates.** An anonymous UID is tied to the install, not the
person. On iOS the credential lives in the Keychain and usually survives an
uninstall, so the user often comes back on their own — real, but not
dependable. On Android it lives in SharedPreferences and is wiped on uninstall.
An unlinked Android player who reinstalls is a genuinely new person, and no
choice about where coins are *stored* changes that. It is an identity problem.

**The ladder, weakest to strongest:**

1. **Anonymous UID** — free, unreliable on Android.
2. **Play Games / Game Center silent link** — no UI, tied to the device's
   Google/Apple account rather than the install. Recovers most reinstalls
   invisibly. The highest-value layer for this genre.
3. **Google / Apple link via the milestone nudge** — dismissible prompt after
   level 10 or 500 coins. Not a gate. Asked once, never nagged. Timing matters:
   at level 1 the player has nothing to lose and declines.

**Premium sits outside the ladder.** Remove Ads restores from the App Store or
Play receipt, independent of Firebase. A player who loses coins never loses
what they paid for. See `src/services/purchases/`.

---

## D-004 — Local-first coins, continuous fire-and-forget sync

**Date:** 2026-09-05 · **Status:** Accepted

**Decision.** MMKV is the read source of truth during play. Every mutation also
enqueues a Firestore write that is never awaited.

**The mistake this avoids.** Writing coins to Firestore is not what costs
latency — *awaiting* it is. The rule is that the UI must be updated from local
state before the network is touched at all:

```ts
balance += n;
mmkv.set('coins', balance);  // synchronous, microseconds
render();                    // tap is fully resolved here
queueSync(balance);          // fire-and-forget, off the critical path
```

**Two directions, two schedules.** These are separate and conflating them is
how coins get lost:

- **Write (local → cloud)** — continuous, throughout play. Never deferred to
  the next launch. If it were, a player who earned 100 coins and then deleted
  the app would lose them.
- **Merge (cloud → local)** — once per cold start, to reconcile a reinstall.

**Flush triggers.** Backgrounding (the important one — deleting an app requires
leaving it first, so this fires before deletion is possible), level complete,
and ~2s idle to coalesce bursts.

**Conflict rule.** Higher `syncVersion` wins. A fresh install has no local
version, so the cloud copy wins — that is what makes a reinstall a restore.
Explicitly **not** `max(local, cloud)`, which would reward reinstalling and
render spend-tracking meaningless.

**Residual risk, accepted.** Coins are lost only if the app is force-quit from
the app switcher without ever backgrounding *and* deleted before next launch,
or if the device was offline at backgrounding, since deleting the app destroys
Firestore's pending-write queue too. Both windows are narrow. No
client-authoritative design eliminates them.

**Known limit.** This trusts the client. A server-side append-only ledger is
the path to cross-device settlement and stronger tamper protection. The
Android coin packs use the client-only scope in D-034.

---

## D-005 — MMKV over AsyncStorage

**Date:** 2026-09-05 · **Status:** Accepted

**Decision.** `react-native-mmkv` for local persistence.

**Why.** Reads are synchronous and memory-mapped. The coin balance is read
during render; an async read there means a frame showing a stale or empty
value, and a visible flicker on the HUD every time the screen mounts.

**Consequence.** MMKV v4 requires Nitro Modules, which must be a direct
dependency in `package.json` — autolinking does not pick it up transitively.
The iOS build fails with `Unable to find a specification for NitroModules` if
it is missing.

---

## D-006 — Levels are JSON, the engine is pure

**Date:** 2026-09-05 · **Status:** Accepted

**Decision.** Levels are static JSON. The engine is pure functions over an
immutable `GameState`, with no React and no native imports.

**Why.** PRD section 37 requires that levels can be added without engine
changes, and purity is what buys the rest almost for free: undo is a stack of
prior states, the solver is a BFS over the same `applyMove`, the hint engine is
the solver run from the current board, and all of it is unit-testable with no
renderer and no mocks.

**Consequence.** `applyMove` must never mutate its input. Undo and the solver
both depend on prior states staying intact — a single in-place mutation breaks
both in ways that are hard to trace.

---

## D-007 — Firebase via CocoaPods, not SPM

**Date:** 2026-09-05 · **Status:** Accepted

**Decision.** `$RNFirebaseDisableSPM = true` in the Podfile, keeping the
Firebase iOS SDK on CocoaPods with static linkage.

**Why.** React Native Firebase v26 resolves Firebase through Swift Package
Manager by default, and its SPM path refuses static linkage — Firebase's SPM
products are automatic libraries, so each RNFB pod embeds its own copy and they
collide as duplicate symbols. The only alternative it offers is
`use_frameworks! :linkage => :dynamic`.

Dynamic frameworks were rejected: every dylib must be loaded and bound at
process start, and the Firebase stack is a lot of them. That is app-launch time
paid on every cold start, which conflicts directly with the project's
no-latency rule. Static linkage also remains the better-tested React Native
path, and `use_frameworks!` globally has a history of friction with other
native modules.

**Consequence.** The Podfile must also mark several Firebase dependencies
`:modular_headers => true` — `GoogleUtilities`, `RecaptchaInterop`,
`FirebaseCore` and friends ship without module maps, which Firebase's own Swift
pods cannot import under static linkage. Scoped to those pods rather than a
global `use_modular_headers!`, which would change linkage for every RN pod.

**Revisit trigger.** Firebase warns that CocoaPods distribution is deprecated
and that no new versions will be published to CocoaPods after **October 2026**.
Existing versions stay available and functional, so this is not urgent, but the
SPM migration is eventually mandatory. When it happens, the launch-time cost of
dynamic frameworks should be measured on a real device rather than assumed —
the tradeoff here was made on that cost, and it may have changed.

---

## D-008 — Static *frameworks* on iOS (supersedes part of D-007)

**Date:** 2026-09-05 · **Status:** Accepted

**Decision.** iOS pods build as static frameworks. Install with
`USE_FRAMEWORKS=static pod install` (or `npm run pods`).

**Why D-007's static *libraries* failed.** The reasoning in D-007 — avoid
dynamic frameworks because every dylib is loaded and bound at process start —
still holds. The implementation did not. Firebase 12.x is Swift-first, and a
plain static library does not emit the generated Swift-interop headers that
Objective-C consumers need. The build failed with:

```
error 'FirebaseAuth/FirebaseAuth-Swift.h' file not found
error could not build module 'RNFBFirestore'
```

Marking pods `:modular_headers => true` got CocoaPods to *resolve*, and got
past two earlier errors, but could not fix this one — the header is generated
at build time by the framework packaging, not by a module map.

**Why static frameworks.** They emit the Swift headers *and* link statically,
so the launch-time argument that drove D-007 is preserved. React Native
supports this directly through the `USE_FRAMEWORKS` environment variable that
the template Podfile already reads, so `react_native_post_install` handles the
framework-specific fixups rather than us hand-rolling them.

**Consequence.** The per-pod `:modular_headers => true` declarations from D-007
were removed — static frameworks define their own modules, making them
redundant. `$RNFirebaseDisableSPM = true` stays: RNFirebase's SPM path rejects
static linkage of any kind.

**Anyone running `pod install` must set `USE_FRAMEWORKS=static`.** A bare
`pod install` silently reverts to static libraries and the Firebase build
breaks again. Use `npm run pods`.

**Lesson worth keeping.** D-007 was decided on a sound principle but was not
validated by an actual build before being written down. The launch-time
reasoning was right; the linkage mode was wrong. Architectural decisions about
native builds need a build to confirm them.

---

## D-009 — Exact A* search and offline candidate generation

**Date:** 2026-10-26 · **Status:** Accepted (supersedes the BFS choice in D-006)

**Decision.** Use A* with `remaining vehicles` as the admissible heuristic.
Every remaining vehicle must leave in at least one move, and one tap moves
only one vehicle, so the estimate cannot overstate the remaining solution.
A binary heap prefers lower estimated total cost, then fewer vehicles, then
insertion order. A cheaper route updates the state cost and parent; stale
heap entries are skipped. Goals are accepted when popped, preserving exact par.

`successors` and `applyMove` share the same immutable transition and travel
rules. Solver expansion builds one occupancy grid per state rather than
rebuilding it for each successor. No dependency or native rebuild is needed.
The 6ms desktop hint benchmark remains a gate, not proof of the 50ms phone
budget. Tests compare par with exhaustive BFS on all shipped boards and 256
small direction configurations.

**Generation.** Generate reviewed JSON offline into a new directory. Existing
shipped IDs and output directories are protected; a batch writes only after
all candidates pass. Geometry is canonicalised across four rotations, ignoring
cosmetic types, colours and IDs. Reject duplicates against shipped boards,
previous default-output batches, and the current batch. Every candidate stores
its accepted uint32 seed, generator version, settings and design metrics.

Difficulty uses initial blocking, extra moves beyond vehicle count, exit-only
clearing waves, and forced moves along one optimal route. These are authoring
heuristics, not calibrated human ratings. A wave calculation stops when partial
moves are needed and is not a complete dependency graph. Sampled hint timing
is machine-dependent; seed/layout generation is deterministic but acceptance
at the timing threshold can differ across machines.

**Consequence.** New candidates are not registered automatically. The current
6x6 painted background remains the playable constraint, even though authoring
supports other square grid sizes. Preview levels 51–55 are a review pool,
not a claim of an advanced campaign or new mechanics.

---

## D-010 — Append-only remote level catalog, cached before publication

**Date:** 2026-10-26 · **Status:** Accepted

**Decision.** Keep levels 1–50 bundled and serve compatible additions as a
versioned cumulative JSON catalog from a dedicated Firebase Hosting site.
Use platform fetch, MMKV and the existing Zustand dependency; no new package
or native module. Public puzzle data is independent of account authentication
and contains neither player information nor executable code.

One MMKV snapshot restores the downloaded catalog synchronously. Background
checks start after the first render, recur on foreground and periodically,
and are throttled to one successful check per hour with a five-minute retry
floor and an eight-second request timeout. Processing/installation waits for
an idle opportunity outside active play. A cleared board may receive content
so the Next button can appear. Offline failure never gates gameplay.

**Validation boundary.** Publishing runs the full solver, geometry/par gate,
duplicate detection and sampled hint benchmark. The phone checks the versioned
schema, supported assets, integer coordinates, geometry and contiguous IDs.
It trusts the configured HTTPS publisher for solvability rather than running
hundreds of solver searches during play. Geometry checks are extracted from
the engine validator so collision rules are not duplicated.

**Stability.** A new revision can only append; previously delivered puzzles
cannot be edited or removed. Stale server revisions are ignored. Persist the
whole new snapshot before exposing it through the reactive catalog. Preserve
old Level object identities; active boards and undo history cannot be reset
by a catalog notification. Player progress remains independent of content
availability, including progress ahead of a device's cache.

**Publishing.** A separate Hosting target avoids replacing the project's
default site or touching Firestore. Predeploy verifies local content and its
append-only relationship to the live feed. Use a single publisher: this check
does not serialize concurrent Hosting deployments. CDN cache lifetime is five
minutes. Rolling back the server does not withdraw already cached levels.

**V1 boundary.** Base level 50, rules version 1, 6x6 boards, existing sprites,
no obstacles; at most 200 remote levels and a 512 KiB response. Larger content
libraries need a paged protocol. New mechanics/assets/grids require compatible
app code and a new channel rather than silently changing existing puzzles.
One mobile app update installs delivery support; subsequent compatible level
releases require only publishing JSON. Device verification remains necessary.

## D-013 — Offline first-release campaign and compatibility (2026-10-26)

Bundle all 100 boards. Reveal batches of 50 using the same pure progression policy on every entry path; paid Skip retains completion semantics. Use 6×6 through 59, 7×7 at 60–79, 8×8 at 80–100 to exercise supported layouts. This is a release scope choice, not evidence of calibrated human difficulty. Preserve published v1/base50 data; use v2/base100 for future101+ content. No generation backend.

## D-014 — Release feedback and recovery (2026-10-26)

Restart is free to keep recovery consistent at zero coins. SoundPool/AudioServices preload short original WAV cues; platform vibration uses a small local native module with no new package. Rebuild both native targets after feedback/OAuth configuration changes. Render positions stay in shared values; decode/cache only needed sprites. Google linking is explicit. Existing-account restore requires confirmation and a durable pending marker, holds cloud uploads until restore succeeds, unions completed levels and adopts cloud coins without adding balances. Network waits exist only in explicit account management, never gameplay taps.

## D-015 — Production signing and QA (2026-10-26)

Release never uses debug signing. Ignored private upload credentials may be overridden by CI secrets. Minified QA uses a separate build flag and debug certificate to preserve the emulator save; release disables preview hooks. Compatible dependency patches, navigation core7.24 and a grpc override fix known transitive issues without changing native package versions. Residual tooling advisories require triage, not an incompatible forced major upgrade.

Delivery requests send Cache-Control:no-cache to revalidate cached HTTP failures. Emulator verification found a predeployment404 retained by the native HTTP cache; revalidation returned the published200 JSON. Application-level request throttling still limits network activity.

## D-016 — Original cartoon effects and native BGM (2026-10-26)

Replace the simple tones with deterministic original toy-instrument cues and a16-bar34-second score. SFX remain predecoded small PCM; BGM is compact AAC streamed/looped by native MediaPlayer/AVAudioPlayer. No new dependency, network, JS audio loop or runtime synthesis. Settings persist a separate music switch and bounded volume. Pause on background; handle Android focus and iOS interruptions. Native rebuild required. Sound and music remain independent; failure must not block gameplay.

## D-017 — Cached shadows and asset budgets (2026-10-26)

Bake4 supported footprint shadows once with CPU Skia surfaces and retain immutable snapshots (about0.99MiB RGBA). Render those textures during motion instead of blurring each vehicle every frame. Preserve a fallback on allocation failure/unsupported footprints. Memoize vehicles against stable pure-engine object identities and memoize the board against unrelated screen updates. No new package, art re-encoding, geometry, gameplay or currency change. CI now audits imported WebP dimensions/byte budgets and matching native audio copies. Inventory estimates are not process-memory measurements; physical-device acceptance remains open.

## D-018 — Daily streak coins and initial cosmetic economy (2026-10-26)

Daily is a manual claim once per device-local calendar date, available at local midnight. Consecutive claims pay20/30/40/50/60/80/100; day7+ remains100. Missing a date resets the next claim to20. A backward date/time change never opens another claim. A focused-screen midnight timer refreshes the UI; backgrounding removes it and foregrounding refreshes from the actual clock.

A durable MMKV intent stores the post-claim balance/version/receipt before applying them. Recovery writes the same values, so interrupted saves and repeated taps cannot lose/double the local award. Only after local persistence does the existing queue sync in the background. Startup, coin reads, sync flushes and explicit account recovery repair pending intents. Cloud receipt reconciliation selects the latest day/time and preserves the longer same-day streak without adding balances. Existing cloud coins still win during confirmed account recovery.

This remains the accepted client-authoritative, offline-first economy. Device-clock abuse and concurrently offline multi-device claims cannot be made globally exactly-once without trusted verification. Before selling currency, use an authoritative coin/reward ledger and verified purchase receipts. No new backend or package is introduced here.

Shared policy reserves50 coins per completed rewarded ad, maximum3/day, and cosmetic prices300/900/1800 (standard/special vehicle/themed pack). These values are configuration only: no ad SDK, ad reward callback, skin checkout or IAP flow is enabled. Existing default colours/vehicles stay free. Assistance prices stay30/20/free/100 for hint/undo/restart/skip.

## D-019 — Cartoon Daily presentation and shared city art (2026-10-26)

Follow the user’s supplied Daily reference with a transparent calendar/title header and a single static Skia surface for all blue bevels and tile/button surfaces. Native text,layout and claim controls remain live. UI geometry is measured on layout,not updated per animation frame. The user first requested Home reuse,then specifically requested a clean `levels_bg.webp` variant; `city_bg.webp` preserves that city composition with the top Levels title sign removed and is used on Daily. Original Home/Levels art remains unchanged. The separate generated city concept and gift concept are not imported into the app. Artwork is WebP and passes the same asset budgets.

Before actual Android Metro bundling,clear only the task-specific generated resource directory. Metro otherwise leaves old image outputs behind after an import is removed. Verify package contents as well as source imports when removing assets.

## D-020 — Bundled Daily display font (2026-10-27)

Use unmodified43,500-byte FredokaOne-Regular.ttf from the pinned official Google Fonts source,with its OFL license included on both platforms. Native font assets avoid a runtime loader,network request or new package. Display labels use the regular cut without synthetic bold; small body copy retains system typography. Native rebuild/install is required. Font/license parity and64KiB budget are checked in the asset audit. This pass changes typography and contrast while preserving the existing button shape and reward behavior.


## D-021 — Local achievements with durable claim receipts (2026-10-28)

Ten achievements offer 950 one-time coins across unique completions, perfect solves and daily-claim streaks. Eligibility and claims are synchronous and offline. A durable MMKV intent records the resulting balance, version and claim receipt before applying them, allowing interrupted writes to replay without another increment. Repair pending claims before cloud balance comparisons.

Reuse the existing player document for background sync: union perfect-level IDs and collected-award IDs, and retain the maximum observed daily streak before replacing daily receipts. Account recovery keeps its existing balance policy; achievement history never adds balances. Valid future receipt IDs survive older clients. No dependency or backend function is added. This client-authoritative ledger does not guarantee globally exactly-once rewards across concurrently offline devices; trusted verification remains required before selling currency. See AWARDS.md for acceptance and migration details.


## D-022 — Earned-coin cosmetics and bounded local history (2026-10-28)

Ship one Red Racer cosmetic for 300 coins, with preview, ownership and explicit Equip. Preserve the existing free fleet and other colour cues by replacing red compact cars only. Use a static transparent WebP derived from the existing master, shared by previews and the cached board registry. No package or native module is added.

A synchronous durable transaction journals the resulting balance/version and inventory before applying them, with a deduplicated history receipt before clearing the intent. Repair before any cloud balance comparison. Daily/Awards keep compatible claim journals extended with history. Ownership is unioned in the existing player document; equipped preference follows the balance winner. Keep only 200 history entries locally: this avoids enlarging every cloud save or implying an audited server ledger. Historical transactions are unavailable; cloud balance changes appear as checkpoints. No real-money sales are enabled.


## D-023 — Separate sale catalog from category equipment (2026-10-28; category-wide selection superseded by D-024)

Per user request, remove free fleet choices from Shop. Purchased sale items show Owned; only Inventory can equip. Add independent free classic colour choices per car/truck/bus category, with Default restoring original level colours. Preserve existing selectedSkin as the car field and Red Racer ownership/behavior. Optional normalized truck/bus equipment travels in the existing inventory cloud snapshot. Free colours are implicitly owned, never purchased.

Use the existing durable transaction for equipment, writing the same balance/version/category state without a coin-history entry. A single sprite routing helper handles decoding/readiness/drawing, with no tint, new art, dependency or engine changes. The existing cloud balance winner selects the equipment snapshot; ownership still merges by union.


## D-024 — Preserve mixed colours with exact appearance slots (2026-10-28)

Correct the misinterpreted D-023 category-wide colour override. A skin targets a declared vehicle type and original palette colour, such as car:red. Other slots retain independent defaults or equipped cosmetics. Catalog replacement lists allow later colour packs without editing levels. Persist normalized owned slot mappings in the existing inventory snapshot, and mirror car:red in legacy selected for compatibility. Discard erroneous classic_colour/category overrides while retaining ownership. Default resets only its own slot.

Replace the platform purchase alert with a native blue/cream cartoon modal, one static Skia frame and existing preview/coin images. Price and balance stay live; Cancel/Close/Back have no purchase side effects. Purchase uses the existing durable ledger and does not equip automatically. No new package, art download, engine or level change.


## D-025 — Native ads and earned-coin ad-free passes (2026-10-28)

Use pinned react-native-google-mobile-ads17.4.0 rather than a custom native ad bridge. It supports RN0.87 New Architecture and provides UMP plus fullscreen lifecycle events. Dynamically import/initialize after the first screen and consent; preload one ad per format, never await ad loading on level navigation, and use UI-independent callback handling. No per-frame store work. Add an on-demand WorkManager provider and a narrow generated Room constructor keep rule after a real minified startup failure. CocoaPods static-framework override and native rebuilds are required.

Reward ladder10/15/20/25/35/50 then10 unlimited replaces D-018's planned cap. Dedicated5-ad pass views grant24 hours and no coins. Coin passes7days/1000 and30days/3000 extend expiry. Use the existing durable coin transaction and player sync for receipts/progress/expiry; real-money verification remains deferred. Test mode uses only official sample units; a production config gate rejects missing publisher IDs. User has no AdMob account yet, so live monetization remains a release prerequisite. See ADS.md.

## D-026 — Bounded asset warm-up after Home artwork (2026-10-29)

First-use vehicle decoding previously began inside the board hook. Warm only the upcoming board into the existing decoded/in-flight sprite cache after Home artwork loads, using an idle callback. Stop scheduling when Home loses focus. Android additionally warms three destination backgrounds, two headers and Back into RN's existing Fresco decoded bitmap cache, sequentially, through a small native module. No extra package, disk/network prefetch, artificial loading delay or full-library preload. Native warming accepts packaged resources only and failures leave normal image loading available. The menu set is roughly19MiB uncompressed before native-cache eviction; no references pin it in memory. iOS keeps normal native image caching; only upcoming-board sprite warming is shared across platforms. This reduces first-use work but is not a measured startup-time guarantee.

## D-027 — In-app account deletion with durable retry and server write lock (2026-10-29)

Settings exposes a destructive confirmation and re-verifies a Google-linked identity using reauthenticateWithCredential, which cannot switch users. Anonymous users refresh their identity token. A durable local journal blocks sync/bootstrap merges and further play once confirmed deletion starts. A server Firestore transaction atomically creates an immutable `deletedPlayers/{uid}` marker (only server deletion time; UID is the document key) and removes `players/{uid}`. Rules reject reads and future writes to the deleted save, including queued writes/other devices with unexpired tokens. Owner-only marker get/create and guarded player deletion replace the old blanket client-delete denial. This introduces one background rules lookup on normal player access, not a gameplay network wait. No extra dependency or custom backend is introduced.

After server cleanup, Firebase Auth deleteUser removes the identity; only then local player/settings records are cleared. Journal stages cloud/auth/local make failures and process restarts retryable. The journal clears last and the completion gate offers an explicit new game. Verification cancellation leaves all records unchanged. The minimal security marker is retained and disclosed, not presented as deletion of every byte. Other devices' local copies and provider-controlled logs cannot be erased remotely. The public email request remains a fallback for players without the app. Real Google selection/deletion acceptance requires a disposable human-controlled account; never test by deleting the user's save.


## D-028 — Route Android game effects through game/media audio (2026-10-30)

Physical Samsung testing found BGM audible while all effects were silent: the MediaPlayer used USAGE_GAME, but SoundPool used USAGE_ASSISTANCE_SONIFICATION and the device's STREAM_SYSTEM was muted. Use USAGE_GAME for SoundPool while retaining CONTENT_TYPE_SONIFICATION, preloading, volume and independent in-app sound control. Respect media volume without changing the user's system sound or vibration settings. Haptics were confirmed working and remain unchanged. This native correction requires rebuilding/reinstalling Android; Metro reload cannot apply it. No dependency, asset or tap-path decoding change.


## D-029 — Special-vehicle clarity at the shared sprite resolution (2026-10-30)

The user explicitly authorized generated replacements for the three blurry legacy special vehicles. Derive them from the approved red-car style and retain PNG masters/prompt provenance outside the runtime registry. Ship243×512 transparent WebPs, matching the regular car resolution; retain face-down orientation and the existing resolver/cache. Runtime art grows87.6KiB encoded and about1.15MiB for the full decoded sprite registry. Update the registry ceiling narrowly from12 to12.25MiB to accommodate the measured12.02MiB, retaining768KiB per sprite and all other budgets. Enforce a512px minimum long edge on every imported vehicle so budget success no longer masks undersized artwork. No new dependency or per-tap work. See `assets/source/special_vehicles/README.md`.


## D-030 — Four-round level ads and Home ad-free entry (2026-10-30)

Reduce forced interruptions from every real result to one cached-ad opportunity every four completed real rounds, including replays. Keep the result-consumed guard, bypass skips/preview, and store only a small synchronous device-local count in MMKV. Count is not currency or a cloud merge field; the player-prefixed key is removed by account deletion. Reset on active-pass result departures. A missed fourth opportunity starts a fresh four-round cycle rather than interrupting the very next round; a local storage failure suppresses the forced ad. Do not advance while backgrounded, save-gated or another ad is showing. Consent/load readiness and ad-free state still gate actual presentation, and gameplay never awaits ad loading. Optional rewarded ads are independent.

Add a48-point-minimum labelled Home Ad-Free button beside Settings using native UI styling and a crossed-AD symbol. It opens the existing AdBenefits route, with the same five-view24-hour and coin-funded passes. No new art, dependency, billing, economy or ad-mode change.


## D-031 — Native win window and shared inventory frames (2026-10-30)

Physical-device reports showed an empty completed board without its win overlay and inventory controls wrapping into two columns while the Skia background retained three. Present results in a real transparent, hardware-accelerated native Modal rather than an absolute sibling view in the game surface. Preserve the400ms exit delay and bounded artwork geometry. Dismiss before consuming Next/Replay/Home: Android uses an unanimated window dismissal followed by one animation-frame handoff; iOS waits for onDismiss. A ref prevents duplicate result actions, with timer/frame cleanup on unmount. No engine, rewards or ad-cadence change.

Inventory now derives six explicit native card frames and the static Skia background from the same pure gridLayout geometry. Absolute card positions avoid flex-wrap divergence, including fractional widths and custom font/display scales, while preserving one background canvas and existing equipment semantics. No new asset, package or per-frame store work. Physical OnePlus NE2211 at1440×3216,density640,font0.9: Level15 preview showed the win dialog after9 taps,Replay worked,and car/truck/bus inventory alignment was checked. Saved100 coins/level1 remained intact.

## D-032 — Production diagnostics with bounded local support context (2026-10-30)

Add @react-native-firebase/crashlytics26.4.0, matching the installed Firebase modules, instead of a second monitoring vendor or an additional Analytics/Performance SDK. Native crash handlers initialize with Firebase; contextual JS setup applies local collection preferences after first paint. All gameplay callers remain synchronous and offline-first. Logical state changes add a bounded50-event in-memory ring; batched250ms native logs/custom keys avoid per-frame work. Significant caught errors are sanitized and deduplicated/capped20 per process; known offline/cancel failures remain breadcrumbs. No save, email, UID, token, screenshot or advertising identifier is deliberately attached. A separate device-local support label correlates voluntarily shared reports with Crashlytics. A React error boundary can retry rendering without clearing progress.

Android release uploads R8/native symbols; QA/performance skip those uploads for local build speed. iOS installs the native pod/run script and emits release dSYMs. Native initialization and extra library bytes are an accepted measured cost for production crash investigation; mappings/source maps remain outside runtime assets. Exact binaries/maps are archived by SHA-256 to ignored private release storage. A Gradle ZIP task preserves native symbols before the uploader removes its intermediates. See release/DIAGNOSTICS.md for console setup, limitations, privacy/deletion and triage.

Installed RNFB26.4 source persisted collection settings without applying them to the current native SDK, and its fatal JS handler used the initial immutable native enabled flag. A small idempotent, version-checked postinstall script applies current-session native settings/clears the user label when disabled and reads the current JS preference for fatal handling. It fails closed on incompatible upstream source/version; review it on upgrades. This avoids a restart-dependent privacy toggle and missing first-session JS reports. No new patching dependency is added. Preserve the original React Native fatal handler chain: controlled testing found the SDK direct-exit path could exit before its queued JS report was persisted. Correlate related JS/native events rather than hiding the native fatal handoff.

## D-033 — Automatic offline chapters after level 100 (2026-11-17)

The current app builds levels 101–2000 in groups of 20 from a bundled, versioned seed table. Contiguous completion through level 99, 119, 139 and the corresponding later boundaries schedules the next group. The group becomes visible after the previous group is complete. Every generated board uses the existing 8×8 layout, and every ID retains the same puzzle across devices and reinstalls. The 100 original boards are unchanged.

The authoring tool validates geometry, exact par, distinct layouts and a conservative sampled hint budget for all seed records. Gameplay expands one group per idle callback and pauses expansion during active puzzles or in the background. It needs no network request, cache or new backend. Keep the seed table and its board recipe stable for existing IDs. The 2,000-level ceiling matches the current cloud save contract. The current build stops polling the v2 level feed, which was empty when IDs 101 onward were assigned.

## D-034 — Google Play Billing for coin packs (2026-11-17)

Android uses Play Billing 8.3.0 for the four one-time consumable coin packs. The publisher chose direct client checkout. The app verifies Play's purchase signature with the app's public licensing key, binds the receipt to the current save, and journals an idempotent local coin credit before consuming the purchase. It retries unconsumed receipts when the save is ready, the app resumes, or the storefront opens. The existing cloud save sync receives the updated balance. Play connections run outside gameplay and no new server or billing account is needed.

The checkout gate opens only when the app's Play licensing public key is configured in `android/play-licensing-public-key.txt`. The local ledger protects against duplicate delivery and interrupted writes on the same install. A modified client can bypass local checks, and recovery after reinstall relies on a synced, recoverable save for already-consumed packs. The mobile client cannot guarantee global exactly-once delivery across devices or automatically revoke refunded coin credit.
