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

- [ ] Create the Firebase project
- [ ] Add `google-services.json` / `GoogleService-Info.plist` (**not
      committed**)
- [ ] Anonymous sign-in at launch
- [ ] Firestore `players/{uid}` document
- [ ] Wire the real write in `syncQueue.flush()`
- [ ] Wire `fetchCloudPlayerState`, verify the `syncVersion` merge
- [ ] Firestore security rules — a player may only read/write their own doc
- [ ] Silent Play Games / Game Center link
- [ ] `SaveProgressPrompt` at the milestone
- [ ] Handle `credential-already-in-use` — offer to switch to the cloud save

**Verify explicitly:**
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
