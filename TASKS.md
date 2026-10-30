# Tasks

Ordered backlog. The order matters — each phase depends on the one before it,
and the sequence is designed to answer "is this fun?" as early as possible.

Status: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Scaffolding ✅

- [x] Directory structure per `ARCHITECTURE.md`
- [x] Install Skia, Reanimated, Gesture Handler, Zustand, MMKV, Firebase,
      Navigation, Nitro Modules
- [x] Babel worklets plugin; gesture-handler entry import
- [x] Podfile: modular headers + `$RNFirebaseDisableSPM`
- [x] Type contracts — `Vehicle`, `Level`, `GameState`
- [x] Zustand stores
- [x] Coin service, sync queue, launch merge, auth scaffolding
- [x] Design tokens
- [x] Documentation set

---

## Phase 1 — Engine ✅

Pure TypeScript. No UI. Fully unit-tested before anything is drawn — this is
the cheapest possible place to get the rules right.

- [x] `collision.ts` — occupancy grid, bounds, `canOccupy`, `vehicleAt`
- [x] `movement.ts` — `maxTravelDistance`, `wouldExit`, `applyMove`,
      `legalMoves`
- [x] Win detection
- [x] `undo.ts` — bounded snapshot stack
- [x] Engine unit tests — 22 passing

**Done when:** a level can be solved end-to-end in a test, with no renderer. ✅
**Watch for:** `applyMove` mutating its input. It must not — covered by a test.

---

## Phase 2 — First playable board

- [x] `geometry.ts` — cell → pixel mapping, the one place that conversion lives
- [x] `arrow.ts` — stroked chevron, built pointing right and rotated per direction
- [x] `Road.tsx` — board surface, grid separators, border
- [x] `VehicleSprite.tsx` — placeholder body, glass, ambient shadow, arrow
- [x] `GameBoard.tsx` — single Skia canvas, responsive square sizing
- [x] `GameScreen.tsx` — header, board, action row; renders level 1
- [x] `App.tsx` wired to GameScreen
- [x] Tap to move, driven by the engine
- [x] `gameStore` wired to `applyMove` / `pushHistory` / `popHistory`
- [x] Undo and Reset buttons spending coins
- [x] Win detection awarding +10 coins

Placeholder rectangles are correct here. Real art comes in Phase 6, and the
whole point of the layer split is that it changes nothing.

**Done when:** level 1 is completable by tapping on a device.

---

## Phase 3 — Feel ✅

The most important phase in the project. If the swipe does not feel good,
nothing later fixes it.

- [x] Movement animation via Reanimated shared values on the UI thread
- [x] Timing per `theme/tokens.ts` — sub-linear √cells, clamped 150–350ms
- [x] Swipe gesture (`Gesture.Exclusive(pan, tap)`)
- [x] Blocked-move shake, nudging along the intended direction
- [x] Exit animation — accelerates off the edge, fades, then unmounts
- [ ] Selection state — deferred, see note below

**Done when:** moving a vehicle is satisfying enough to do repeatedly for no
reason. Verified on an Android emulator; **still needs a real mid-range device**
— an emulator cannot tell you whether this feels good.
**Watch for:** any per-frame value reaching a Zustand store. Currently none:
the sprite is drawn at its logical position and motion is an offset easing to
zero, so the store only ever sees the destination.

**On selection state:** deliberately skipped. A tap moves the vehicle
immediately, so there is no interval during which a vehicle is "selected but
not yet moved". Adding a highlight would mean either delaying the move (which
costs response time) or flashing a state the player never sees. Revisit only if
a tap-then-confirm accessibility mode is added.

---

## Phase 4 — Loop closure ✅

- [x] Win detection wired to UI
- [x] `LevelCompleteModal` — moves vs par, perfect-solve badge, 400ms reveal
      so the exit animation is not stepped on
- [x] Coin award on completion
- [x] Advance to next level (`navigation.replace`, so Back does not stack)
- [x] `HomeScreen` with Play/Continue, `LevelSelectScreen` with lock state
- [x] `SettingsScreen` toggles persisting to MMKV
- [x] `NavigationContainer` + `RootNavigator` wired in `App.tsx`
- [x] `GameScreen` reads `levelId` from the route, not a hardcoded 1
- [x] Levels 2 and 3 added so the loop has somewhere to go
- [x] BFS solvability test over every shipped level

**Done when:** a player can go from launch through several levels without
getting stuck in the UI. ✅ Verified on device: Home → Play → clear → modal →
Next → Level 2, with level select showing 1 ✓ / 2 unlocked / 3 locked.

**Invariant worth preserving — coins are awarded once per level, ever.**
Device testing caught a double-award: `navigation.replace` remounts GameScreen
with the new levelId while the store still holds the previous level's `won`
state for one render, so the award effect fired twice. Two guards in
`GameScreen`, for two different failure modes:

- `level.id !== levelId` → skip. Rejects the stale render during a transition.
- already in `completedLevels` → skip. Replaying a cleared level would
  otherwise be a trivial coin farm.

If you touch that effect, keep both.

---

## Phase 5 — 20 levels ✅

- [x] `solver.ts` — BFS with dedupe, parent-pointer reconstruction, node cap
- [x] `levelValidator.ts` — geometry, solvability, par, trivial/complexity gates
- [x] `npm run validate:levels` wired
- [ ] Add `validate:levels` to CI ← **no CI configured in this repo yet**
- [x] Author levels 1–6 by hand (tutorial — one idea each)
- [x] Generate levels 7–20 (`npm run generate:levels`)
- [x] `npm run stamp:par` — par is solver-computed, never hand-typed
- [x] Validate every level; all 20 pass

**Done when:** 20 validated levels ship and levels 1–10 teach the mechanic with
no text. ✅ Par ramps 1 → 11, vehicles 1 → 9, heaviest search 523 nodes / 8ms.

**Also landed here:** `hint.ts` is implemented (it is a thin wrapper over the
solver, so building it separately made no sense). The hint *button* is still
disabled — wiring it is Phase 7.

**On generated levels.** 7–20 come from `generate-levels.ts`, which places
vehicles at random and throws almost all candidates away. The solver is the
filter: a board ships only if solvable, within a target par band, and
*interesting* — at least two vehicles blocked at the start, so the player has
an ordering problem rather than a list of taps. Every level records the seed
that produced it, so any board can be regenerated or explained.

**Why par is never hand-typed.** A wrong par silently mis-rates a level and
hands out "perfect solve" badges for sloppy play. `stamp:par` derives it from
the solver; `validate:levels` fails on `PAR_MISMATCH` if the two ever diverge.

---

## Phase 6 — Real art

Blocked on the art pipeline, not on code. See `ASSET_GUIDELINES.md`.

- [ ] Art bible approved
- [ ] Master vehicle approved
- [ ] Derive taxi, bus, truck, remaining car colours
- [ ] Environment: road, grass, sidewalk
- [ ] Arrows, exit marker, selection indicator
- [ ] UI icons
- [ ] Replace placeholder sprites

**Done when:** swapping the art required no gameplay change. If it did, the
layer boundary leaked and that is the real bug.

---

## Phase 7 — Assistance and economy ✅

- [x] `hint.ts` on top of the solver (landed in Phase 5)
- [x] Hint UI — pulsing glow, cancelled explicitly when the hint is spent
- [x] Undo, Reset and Skip wired to their costs
- [x] `CoinCounter` with count-up
- [x] Insufficient-funds path (`NotEnoughCoins`)
- [x] Hint latency measured — `npm run bench:hints`
- [ ] Confirm hint latency on real mid-range Android hardware

**Verified on device:** hint glow renders and costs exactly 30; Skip costs
exactly 100, unlocks the level and pays nothing; buttons dim correctly as the
balance falls below each cost; Undo stays inert while there is no history.

**A skip is not a solve.** The completion modal originally showed the move
count, par and a "Perfect solve ⭐" badge after a Skip — and since a skip is
always 0 moves, it beat par every time. It now reads "Skipped ⏭" with the
stats and badge suppressed. Typecheck and 108 unit tests all passed while that
bug was live; only looking at the screen caught it.

**Watch for:** a hint that suggests a useless move. Worse than no hint.

**Charge only after the hint is found.** `handleHint` runs the solver first and
charges second. If the board has become unsolvable there is no useful move to
sell, and taking 30 coins for "sorry, reset" is the fastest possible way to
teach players never to buy a hint again.

**Skip pays nothing.** A skipped level still unlocks the next one, but must not
pay the completion reward — otherwise Skip costs a net 90 rather than 100, and
on a cheap level it becomes a way to *earn* by not playing. Tracked by the
`skipped` flag in `gameStore`.

**`disabled` and `affordable` are different.** Disabled means the action is
meaningless right now (nothing to undo) and is inert. Unaffordable actions stay
tappable and explain themselves — a dead button reads as a broken UI.

### The benchmark caught a validator bug

`bench:hints` showed levels 14 and 15 at 14.6ms and 7.8ms in Node — roughly
70-150ms on a mid-range phone, well over the 50ms budget — despite passing
validation.

The validator was **measuring the wrong thing**: node count from the *opening*
board. But a hint is computed from wherever the player actually is, and a
player who has wandered off the optimal line is exactly who buys one.
`worstHintCost` now samples every position along the optimal solution plus
every position one non-optimal move from the start.

The fix, though, was not to reject those levels. Profiling showed the cost was
per-node, not node count: `legalMoves` rebuilt the whole occupancy grid once
per vehicle, and the solver calls it on every node. Building the grid once per
state and threading it through cut the worst hint from **14.61ms to 2.62ms**
(~5.6x) and left every level shippable. If the solver ever feels slow again,
look for a rebuilt grid before blaming level design.

---

## Phase 8 — Firebase

- [x] Create the Firebase project (`gridlock-bee41`)
- [x] Add `google-services.json` / `GoogleService-Info.plist` (**not
      committed**)
- [x] Anonymous sign-in at launch — code complete
- [x] Firestore `players/{uid}` document shape
- [x] Wire the real write in `syncQueue.flush()` — fire-and-forget, merge:true
- [x] Wire `fetchCloudPlayerState` + `syncVersion` merge
- [x] `bootstrap.ts` — runs alongside first render, never rejects, 8s cloud cap
- [x] Flush on level complete (third trigger, alongside background and idle)
- [x] `firestore.rules` written
- [x] Enable Anonymous sign-in in the Firebase console
- [x] Create the Firestore database (`(default)`, asia-south1 — permanent)
- [x] Deploy the rules (`firebase deploy --only firestore:rules`; config in `firebase.json`)
- [ ] Silent Play Games / Game Center link ← blocked on OAuth config
- [ ] `SaveProgressPrompt` at the milestone ← gated off until linking works
- [ ] Handle `credential-already-in-use` — offer to switch to the cloud save

### Blocked on Firebase console settings, not code

**Anonymous sign-in is disabled.** `signInAnonymously` fails with
`CONFIGURATION_NOT_FOUND`. Fix in Authentication → Sign-in method → Anonymous →
Enable. Nothing in the sync path can be verified until this is on.

**No OAuth client exists**, so no link path can work. `google-services.json`
has no `oauth_client` entry. Enable Google sign-in in the console, add the
debug SHA-1, re-download the file, then flip `isAccountLinkingConfigured()` in
`authService.ts` to a real check.

Until then `shouldShowNudge` returns false — offering to save progress when no
provider is configured would open a prompt whose only outcome is an error.

**Verified anyway:** with auth failing, the app still launches, renders, and
plays from local state with no crash and no unhandled rejection. That is the
whole point of `bootstrap()` never rejecting.

**Verify explicitly — all still pending, blocked on console setup:**
- Earn coins → background the app → confirm the write lands.
- Earn coins offline → return online → confirm it drains.
- Reinstall with a linked account → confirm coins restore.
- Confirm no coin operation ever awaits the network.

---

## Phase 9 — Audio

- [ ] Choose a low-latency library (measure before committing)
- [ ] Preload every clip at startup
- [ ] Wire move, blocked, exit, win, coin
- [ ] Respect `settingsStore`

---

## Phase 10 — v0.2 and beyond

- [ ] Particles and effects
- [ ] Levels 21–50
- [ ] Daily reward
- [ ] Analytics
- [ ] Rewarded ads, then interstitials (every 3–4 levels, never mid-level)
- [ ] Difficulty rebalancing from real data
- [ ] Remove Ads purchase + restore
- [ ] Achievements, daily challenge
- [ ] Skins and environments
- [ ] Levels 51–100

---

## Known follow-ups

- **Server-side coin ledger.** Required before coins are ever sold for money.
  `CoinService` is an interface so the swap is contained. `DECISIONS.md` D-004.
- **Accessibility layer over the Skia canvas.** Skia draws are invisible to
  screen readers; this needs designing rather than retrofitting.
- **`npm audit`** reports vulnerabilities from the install — triage before
  release.
- **Android release signing** is unconfigured.


### Phase 8 verified on device (2026-09-11)

| Check | Evidence |
|---|---|
| Anonymous sign-in | `signInAnonymously:onComplete:success` |
| Write lands | `[sync] wrote coins=130 v3`, acknowledged by the server |
| Launch merge, in sync | `merge=local_wins` |
| Restore when local storage is lost | MMKV deleted, player kept → `merge=cloud_wins`, HUD shows 130 not 100 |
| Offline earn | Tap resolved instantly in airplane mode; write drained on reconnect (`coins=140 v4`) |
| Rejected write self-heals | After PERMISSION_DENIED, the next coin change re-queued and succeeded |

**Gotchas hit, worth remembering:**
- Enabling a sign-in method does NOT create a database. Writes fail `NOT_FOUND`
  until Firestore → Create database is done.
- Freshly deployed rules took ~1 minute to take effect on a new database; the
  first requests were `PERMISSION_DENIED` with correct rules.
- The rules use `is number`, not `is int` — the client SDK decides the encoding.
- Sync errors are swallowed for players; `[sync]` / `[bootstrap]` log lines in
  `__DEV__` builds are the only way to see them.

**Gap found: level progress is not synced.** Only `coins` and `syncVersion` go
to the cloud. A restore brings coins back but resets the player to Level 1.
- [x] Sync `completedLevels` / `currentLevel` alongside coins
  - Merged by UNION, not by `syncVersion`: progress only grows, so combining
    both copies is always right and a stale copy can never erase a level.
  - The queue now writes a snapshot of local state at flush time, so a level's
    coin reward and its progress go up in one write.
  - Verified: local storage wiped, player kept → `merge=cloud_wins
    progress=restored`, Home showed "Continue · Level 20" with 300 coins from
    real play, not Level 1.
  - `devToggleUnlockAll` is deliberately not synced — with union merge it would
    make "unlock all" permanent in the cloud.

**Still not testable:** reinstall on Android without a linked account — the
anonymous UID is wiped with the app, so there is nothing to restore to. That
needs the Google / Play Games link (blocked on an OAuth client in the console).

### Solver and authoring tooling (2026-10-26)

- [x] Share occupancy calculations across successor moves without duplicating rules
- [x] Exact A* solver; compare shortest par against exhaustive BFS
- [x] Configurable seeded generator with protected outputs and batch quality gates
- [x] Reject rotated/cosmetic duplicate layouts
- [x] Store accepted seeds, settings and difficulty metrics with each candidate
- [x] Sample hint latency before exporting; share sampling with `bench:hints`
- [x] Export five unregistered candidates in `generated-levels/preview-51-55`
- [ ] Playtest preview candidates and calibrate difficulty from player data
- [ ] Profile release builds on mid-range Android (desktop timings are not device timings)

### Automatic level delivery (2026-10-26)

- [x] Reactive campaign combines bundled 1–50 with synchronous MMKV content cache
- [x] Background public catalog download, timeout, throttling and foreground retries
- [x] Defer processing/install while a puzzle is active; preserve board/undo identities
- [x] Version/schema/asset compatibility, shared engine geometry and append-only IDs
- [x] Cumulative release tooling: exact par, solvability, duplicates and hint latency gates
- [x] Dedicated Firebase Hosting target and predeploy comparison with the live catalog
- [x] Publish revision 1 (levels 51–55) and verify it with the actual app transport/parser
- [x] TypeScript, lint, 387 tests, bundled-level validation and hint benchmarks pass
- [ ] Device check: 55 levels online, Next from 50 to 51, offline restart, update during play
- [ ] Release the mobile app update that introduces delivery (future compatible batches need only JSON publication)

Publishing and compatibility details: `level-content/README.md`.

### First release implementation (2026-10-26)

- [x] Bundle 100 levels; preserve immutable 51–55; reveal chapters of 50
- [x] Dynamic 6×6 / 7×7 / 8×8 grid and virtualized selection
- [x] Version 2 future-content channel with legacy v1 preserved
- [x] Free restart, native preloaded audio/haptics, reduced motion and screen-reader targets
- [x] Google link/restore with durable offline retry and cloud coin precedence
- [x] Configure upload signing, generate private ignored key, add CI and release pages
- [x] 603 tests and 100-level solver validation
- [ ] Full human campaign difficulty pass and physical-device profiling
- [ ] Interactive Google restore acceptance, store console/distribution setup and submission

See RELEASE_CHECKLIST.md for current acceptance status; older snapshots above are historical.

### Cartoon audio and music (2026-10-26)

- [x] Replace6 simple tones with original cartoon cues; wire coin rewards and navigation/action taps
- [x] Compose and compress original34-second toy-town music,about250KB
- [x] Native loop, background pause, Android focus/duck and iOS interruption handling
- [x] Persist independent music toggle and volume; scrollable Settings
- [x] 606 tests, TypeScript/lint and Android/iOS builds
- [ ] Human listening approval and physical-device route/interruption acceptance

### Performance and asset management (2026-10-26)

- [x] Reuse4 preblurred shadow textures; memoize unchanged vehicles and board
- [x] Add imported-WebP and native-audio budget audit to CI
- [x] Inventory runtime artwork1.92MiB and vehicle pixel cache10.40MiB
- [x] 609tests,TypeScript/lint,asset audit and100-level validation; signed bundle build
- [x] Minified emulator8×8 visual check and real-tap level80 victory
- [ ] User physical-device frame/memory/thermal acceptance

Ads,coin earning,skin packs and purchases are future work; no monetization was implemented in this change.

### Daily rewards and economy values (2026-10-26)

- [x] Unlock Home Daily and show7-step streak rewards with local-midnight availability
- [x] Once-per-date claim, missed-day reset, day7+ cap and backward-clock guard
- [x] Persist receipt/balance/version through a recoverable local intent; sync in background
- [x] Reconcile daily receipts on launch and Google account recovery
- [x] Reuse existing WebP; no new package or generated artwork
- [x] Central policy: ad50/max3 daily, standard skin300, special900, themed pack1800 (planned only)
- [x] 629 tests including repeated claims, each interrupted write, midnight/foreground timers and restore policy
- [ ] Ad SDK/verified rewards, cosmetic inventory/checkout and real-money purchase verification (future work)

### Cartoon Daily UI (2026-10-26)

- [x] Follow user-supplied reference: calendar banner, beveled blue panel,4+3 reward grid,gold amounts and raised button
- [x] Use the clean `levels_bg.webp` variant requested in the latest instruction; preserve the original Levels art
- [x] Ship only55KB transparent header WebP; retain generated concept sources outside runtime imports
- [x] Keep reward logic,amounts,claim controls and accessible labels live
- [x] 629 tests,TypeScript,lint and asset budgets pass

### Daily font and text-colour pass (2026-10-27)

- [x] Bundle43KB Fredoka One font and license on Android/iOS
- [x] Apply rounded display typography to Daily headings,numbers,tiles and button
- [x] Dark-blue collected label,dark-green claim label and reduced text shadows
- [x] Extend asset audit to verify font/license copies and64KiB font budget
- [x] 629 tests,TypeScript,lint,asset budgets and both native builds pass

### Consistent back button (2026-10-27)

- [x] Generate glossy blue back art from the Home settings-icon master
- [x] Convert to a lightweight256px WebP and register one shared resolver/component
- [x] Replace individual back controls on Game,Levels,Daily and Settings
- [x] Add the same back control to the Shop placeholder
- [x] 629 tests,TypeScript,lint and asset budgets pass; test APK/release bundle build and Daily visual check complete

### Public publisher identity (2026-10-27)

- [x] Use Developed by AksSoft instead of the personal developer name
- [x] Add a direct developer-portfolio link in Settings
- [x] Update public support/privacy pages and store-release metadata; preserve the portfolio URL
- [x] 629 tests,TypeScript/lint and Android test/release builds pass; public pages deployed


### Offline Awards (2026-10-28)

- [x] Implement 10 achievements, 950 total one-time coins, manual collection and Home availability badge
- [x] Track unique perfect replays and best observed daily streak; count existing completions
- [x] Recover interrupted local claims and merge history with the existing cloud save without adding balances
- [x] Reuse existing city/trophy/back art and font; virtualize the list
- [x] TypeScript, lint, 656 tests and asset audit pass; Android performance APK and signed release bundle build
- [x] Inspect native Awards screen and scrolling on emulator; leave available rewards unclaimed for user testing
- [ ] User acceptance of reward collection/account restore on a real device


### Garage and local coin history (2026-10-28)

- [x] Add Red Racer at 300 earned coins; preserve the free classic fleet and other colour cues
- [x] Preview art, confirm purchases, browse owned inventory and equip/revert cosmetics
- [x] Durable purchase intent includes deduction, ownership and history; recover before cloud merge
- [x] Sync ownership/equipment using the existing player save; no new backend/package
- [x] Keep latest 200 local coin-history entries for gameplay, rewards and purchases; mark restored balances as checkpoints
- [x] Optimize generated master-derived artwork to 43 KiB WebP; asset budgets pass
- [x] TypeScript, lint and 678 tests pass; Android test APK and signed release bundle build
- [x] Native Shop preview, Inventory, History and confirmation/cancel inspected on emulator; no purchase made from the user's balance
- [ ] User acceptance of purchase/equip and real-device gameplay appearance


### Shop reference layout (2026-10-28)

- [x] Replace large Garage cards with SHOP/cones art, Cars/Trucks/Buses tabs and a tinted three-column grid
- [x] Keep existing six classic colours free in each category; support enlarged asset previews
- [x] Preserve Red Racer purchase/equip, Inventory and Coin History controls
- [x] Reuse city background and all vehicle art; add only 41 KiB transparent header WebP
- [x] One static Skia surface draws all grid gradients/buttons, with native accessible controls
- [x] TypeScript, lint, 678 tests, asset audit and Android APK/release bundle pass
- [x] Inspect native grid/header layout, category switching and enlarged preview on emulator; no coins spent


### Shop sale items and exclusive equipment (2026-10-28)

- [x] Remove the free fleet from Shop; show only sale cosmetics with Owned or catalog price
- [x] Inventory shows Default equipped initially and Equip on alternatives; tap image/button to switch
- [x] Persist one independent choice per car/truck/bus category and apply it through the sprite resolver
- [x] Preserve Red Racer entitlement and original red-car-only replacement; free colours cost nothing
- [x] Journal category selection with no coin change/history entry; include equipment in existing cloud restore/merge
- [x] TypeScript, lint, 690 tests, asset audit and Android APK/release bundle pass
- [x] Native check: Sky Blue equips and Default deselects, balance remains855; Level19 displays blue compact cars with original bus/truck/ambulance art and zero moves


### Exact-colour skins and purchase popup correction (2026-10-28)

- [x] Remove erroneous category-wide colour overrides; preserve original mixed-colour fleet
- [x] Catalog declares type/colour replacements; normalized owned slot mappings select each appearance independently
- [x] Migrate old Red Racer selection and discard classic_colour/category overrides without losing purchases
- [x] Default inventory entries restore only their matching slot; purchased skins deselect only that slot's default
- [x] Replace platform Alert with a blue/cream cartoon purchase modal, actual preview, price, balance, Cancel/Close/Buy and inline errors
- [x] TypeScript, lint, 697 tests, asset audit and Android test/release builds pass
- [x] Native purchase popup inspected on portrait emulator with real preview, 300-coin price and 895-coin balance; Cancel tested without purchase
- [x] Native Level23 check confirms original mixed-colour cars/buses/trucks restored, zero moves and895 coins; no purchase made


### Shop banner subtitle alignment (2026-10-28)

- [x] Match the header's3:1 artwork ratio and center live text inside proportional blue-strip bounds
- [x] Remove bottom-margin positioning/Android font padding; fit a single line across widths
- [x] Native emulator visual check confirms the subtitle is centered; no new art added
- [x] TypeScript, lint, 697 tests and Android test/release builds pass


### Ads and earned-coin ad-free passes (2026-10-28)

- [x] Native Google Mobile Ads/UMP integration with official test units and deferred initialization
- [x] Rewarded coin ladder10/15/20/25/35/50 then10 without daily cap; midnight reset
- [x] Results-transition interstitial on real wins, immediate navigation for no-fill/failure/pass holders
- [x] Coin passes7days/1000 and30days/3000 with explicit confirmation, extension and duplicate protection
- [x] Dedicated five-ad pass flow, separate progress, no coin double reward,24-hour expiry after fifth completion
- [x] Durable receipt/counter/expiry transaction and existing player-save merge/recovery
- [x] Coins & Ad-Free entry from coin+ and Settings, privacy choices and native audio pause/resume
- [x] Test config validator and production release gate (currently blocked by absent publisher AdMob IDs)
- [x] Fix minified Room constructor crash; defer WorkManager initialization off first-screen startup
- [x] TypeScript/lint and733 tests pass; Android APK/AAB and iOS simulator native build succeed
- [x] Actual Google rewarded test ad grants10 coins; interstitial between replayed levels1/2 displays/closes correctly
- [ ] Publisher creates AdMob account/apps/ad units and consent messages, supplies IDs and passes production config gate
- [ ] Physical-device/internal-store live configuration acceptance and final store privacy/Contains Ads declarations
- [x] Native midnight/restart check retains3/5 day-pass progress without coin-ladder advancement
- [x] Five native Google rewarded pass ads activate24-hour ad-free expiry; coin balance remains640 and optional coin ads stay available


### Neutral coin+ entry (2026-10-29)

- [x] Replace Watch ads / Ad-free passes with Coins & Ad-Free
- [x] Use Your coins heading and remove the ad-watching prompt from the popup
- [x] Keep existing rewards/passes navigation; do not advertise unavailable real-money purchases
- [x] TypeScript, lint,733 tests and Android APK/AAB builds pass

### Cartoon coin information popup (2026-10-29)

- [x] Match blue/gold reference with live title, balance, level reward and glossy actions
- [x] Reuse existing coin artwork; preserve neutral wording and insufficient-funds entry
- [x] Add scrollable modal and hardware Back dismissal; keep controls accessible
- [x] TypeScript, lint and733 tests pass
- [x] Android performance APK/signed bundle build; native portrait layout inspected with640-coin balance

### Ad reward completion feedback (2026-10-29)

- [x] Show saved daily coin-ladder completions in green with Completed/Next/Upcoming labels
- [x] Keep the earned active five-ad pass at5/5 with full progress and Completed status
- [x] Show actual expiry for the next pass; preserve partial progress and unlimited coin ads
- [x] TypeScript/lint,733 tests and Android APK/AAB builds pass; emulator confirms six completed green coin tiles and active5/5 day pass with expiry

### First-visit asset loading (2026-10-29)

- [x] Inspect native loading: packaged Android resources already have no default fade; board sprites previously started decoding on board mount
- [x] Warm upcoming-board sprites after Home artwork/idle time using existing shared decode cache
- [x] Add bounded Android decoded-menu-cache warm-up, with local resources only and no new dependency
- [x] Stop further scheduling on Home blur/background; preserve normal loading/retry on failure
- [x] TypeScript,736 tests and unchanged WebP/audio/font budgets pass
- [ ] Physical-device cold/warm launch and first-route latency/memory measurements
- [x] Lint clean; Android performance APK/signed bundle builds pass; emulator cold launch, Daily artwork and Level27 mixed-colour board inspected without moving vehicles

### Settings and deletion-request pages (2026-10-29)

- [x] Fix edge-to-edge ad rows/account spacing with a shared padded, wrapping Settings layout
- [x] Add explicit in-app account-deletion request and approved public support email
- [x] Create dedicated deletion page and restyle privacy information from Dearfuture's card-based reference
- [x] Keep game-specific disclosures, portfolio attribution and honest manual-email request semantics
- [x] Document identity verification, session invalidation and manual Auth/player-document deletion; no user data deleted
- [x] TypeScript/lint,736 tests and Android APK/AAB builds pass
- [x] Firebase pages deployed; desktop/mobile layouts inspected; Settings deletion link opens the correct live page
- [ ] Publisher monitors support inbox and manually processes verified deletion requests; no test request sent or account deleted

### Direct in-app account deletion (2026-10-29)

- [x] Explicit destructive confirmation and identity re-verification; supports anonymous and Google-linked accounts
- [x] Atomically delete cloud save with a minimal security marker that blocks stale-session recreation
- [x] Delete Firebase Auth identity, clear local records and offer an explicit fresh game
- [x] Durable cloud/auth/local retry journal, global gate, sync/bootstrap protection and wrong-account guards
- [x] Preserve web/email fallback, disclose retained marker and update public instructions/operator documentation
- [x] 753 tests and isolated Firebase emulator rules/Auth-deletion checks pass; no real player account deleted
- [ ] Disposable human Google-account deletion acceptance
- [x] Firestore deletion rules and revised public pages deployed successfully
- [x] Android performance APK/signed AAB builds pass; normal-app deletion warning inspected and Cancel verified with original Player ID retained

### Cartoon deletion confirmation (2026-10-29)

- [x] Replace platform deletion alert with reference-based red/cream modal, warning/trash symbols and glossy blue/red actions
- [x] Keep native live warning copy, accessibility labels, scroll/wrap layout and hardware Back cancellation
- [x] Preserve deletion service and guard duplicate confirmation/modal-to-Google handoff
- [x] TypeScript/lint,753 tests and Android performance APK/signed AAB pass
- [x] Portrait emulator layout inspected; Cancel closes the custom warning and original Player ID remains intact; no deletion performed

### Smaller vehicle arrows (2026-10-29)

- [x] Reduce arrow length and stroke while preserving readable direction cues and a thin dark outline
- [x] Keep existing geometry, placement, movement and accessibility behavior
- [x] TypeScript/lint and753 tests pass; no new assets/dependencies
- [x] Android APK/signed AAB builds pass; Level15 checked in emulator with smaller outlined arrows across car/bus/ambulance art, zero moves


### Gameplay, asset and responsive UI review (2026-10-29)

- [x] Review main screens, inventory categories, transaction history and dialogs in minified Android builds
- [x] Stress compact 360×640 dp / 150% text; fix cropped headings, crowded HUD, purchase labels, win stats and deletion actions
- [x] Keep menu scrolling clear of status chrome and the Levels list below its painted title
- [x] Native preview solutions for levels 1/60/80/100; blocked move, Hint, Undo, Restart, Replay and Next verified without spending coins
- [x] Fix and verify result Home/back-stack navigation; preserve the user's save and restore emulator display settings
- [x] TypeScript/lint,764 tests,100-level validation,asset budgets,hint benchmark and Android QA/performance/release builds pass
- [x] Record native review/evidence in `release/QA_REVIEW_2026-10-29.md`
- [ ] Physical-device performance/accessibility and iOS visual acceptance remain release checks


### Physical Android sound-effects routing fix (2026-10-30)

- [x] Diagnose connected Samsung SM-S938B: system stream muted, media stream audible; haptics confirmed working by user
- [x] Route SoundPool through USAGE_GAME, retain sonification content and preloaded cues; no phone settings changed
- [x] TypeScript/lint,764 tests,Android performance APK/signed release bundle pass; final AAB signature verified
- [x] Install update with app data retained; physical-device diagnostics confirm SoundPool and BGM both use USAGE_GAME
- [x] User confirmed movement/completion sound effects work on the physical phone after the update


### Special-vehicle source resolution (2026-10-30)

- [x] Confirm police95×238,ambulance110×246,taxi102×223 are low-resolution source WebPs; coloured cars are approximately243×512
- [x] Confirm the shared Skia renderer decodes original files and uses contain sizing; no special-vehicle downsampling path
- [x] User authorized generated replacements; derive from the red-car master, export243×512 transparent WebPs and replace all three sources
- [x] Inspect native6×6/8×8 emulator boards and pass encoded/decoded budgets; real-phone comparison pending reconnection

The earlier asset-budget audit did not enforce a minimum sprite resolution. No higher-resolution originals were found in the repository. Do not upscale the small files and describe the result as restored detail. Asset creation requires explicit user authorization overriding the repository's no-final-art rule.

- [x] Archive original small files,1821px PNG masters,exact prompts and export commands; add a512px minimum-resolution audit gate
- [x] TypeScript/lint,764 tests,asset audit and Android QA/performance/signed bundle builds pass


### Less frequent level ads and Home Ad-Free shortcut (2026-10-30)

- [x] Offer one cached level ad after every four completed real rounds; preserve skip/preview/ad-free behavior
- [x] Persist local pacing across restart; skip unavailable opportunities without an immediate catch-up ad
- [x] Guard background/concurrent-ad/save failure; keep rewarded ads and currency independent
- [x] Add gold crossed-AD Home shortcut beside Settings, opening existing Coins & Ad-Free offers
- [x] TypeScript/lint,778 tests,asset audit,Android QA/performance/signed AAB and bundle signature pass
- [x] Native Home/destination/back checked at normal and compact150% text; restore display and original275-coin/current15 save

Cadence is exercised through the coordinator and persistent-service tests. Native full interstitial cycling was not forced on the user's save; the emulator has an active pass. Production ads remain in the previously requested test mode.


### Smaller phone-test APK (2026-10-30)

- [x] Attribute144.2MB universal installer size primarily to native libraries for four CPU architectures; runtime artwork remains2.37MiB
- [x] Preserve universal artifact and build an ARM64-only test installer,48.4MB, with identical JS/art/resource entries
- [x] Install/start on the ARM64 emulator and document reproducible build flags; no app code/economy/quality change


### Real-device win dialog and inventory correction (2026-10-30)

- [x] Replace ordinary win overlay with a hardware-accelerated native modal; preserve delay and dismiss-before-action ordering
- [x] Guard repeated actions and cancel pending reveal/dismiss work on reset/unmount
- [x] Share explicit inventory card frames between native controls and static Skia art, eliminating independent flex wrapping
- [x] Test fractional grid widths,large fonts,native reveal/reset,reward rerenders,duplicate taps and iOS dismissal handoff
- [x] Verify Level15's9-move win and Replay on the connected OnePlus in safe preview mode
- [x] Verify cars/trucks/buses in Inventory on the physical phone; restore normal build/Home with100 coins/level1 unchanged
- [x] TypeScript/lint,789 tests,asset audit,ARM64 QA/performance builds,full release AAB and bundle signature pass

### Release diagnostics (2026-10-30)

- [x] Audit: Crashlytics was absent and analytics track was a stub
- [x] Add matching native Crashlytics, bounded breadcrumbs/context, handled-error reporting and React recovery boundary
- [x] Add local Support code, voluntary issue sharing, collection preference and deletion cleanup
- [x] Add version-checked RNFB current-session collection fix and exact binary/map archive tool
- [x] Document Firebase triage, alert setup, data handling and release symbolication; update privacy/support source pages
- [x] Verify emulator non-fatal/native/JavaScript crash capture, HTTP200 transport, current-session collection off/on, Settings and support sharing
- [x] Verify exact Hermes source-map decoding, ARM64 test installers, signed four-ABI release AAB, R8 upload and104 generated/uploaded native symbol files
- [x] Build the iOS ARM64 simulator with Crashlytics and archive exact Android release companions; publish privacy/support updates
- [ ] Owner acceptance: confirm test issues/custom keys in Firebase Console, choose/verify alert recipients and review Play Data safety diagnostics declarations; see release/DIAGNOSTICS_QA_2026-10-30.md
