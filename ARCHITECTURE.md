# Architecture

How the code is structured and, more importantly, which boundaries are not
allowed to blur. For *why* each choice was made, see `DECISIONS.md`.

---

## The three layers

```
                        GAME
                          │
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
   Game Logic         Renderer             UI
   (pure TS)          (Skia)          (React Native)
        │                 │                 │
   state, rules      board, sprites    menus, HUD,
   collision         animation         coins, shop
   solver, hint      effects           navigation
```

The layers depend **downward only**:

- Game Logic imports nothing from Renderer or UI.
- Renderer reads Game Logic state. It never decides rules.
- UI orchestrates both. It never implements rules.

If the renderer ever needs to ask "is this move legal?", the answer belongs in
the engine and the renderer calls it. A rule implemented in two places will
drift.

---

## Directory map

```
src/
  game/
    engine/          Pure rules. No React, no native imports.
      collision.ts     occupancy grid, bounds, overlap
      movement.ts      applyMove, maxTravelDistance, legalMoves
      solver.ts        A* — validation at build time, hints at runtime
      hint.ts          next useful move from the current board
      levelValidator.ts build-time gate (PRD §27)
      undo.ts          bounded snapshot history
    models/          Types shared by every layer
    levels/          Bundled JSON + fallback registry
    rendering/       Skia components. Draw only.

  screens/           One file per route
  components/        Reusable RN chrome (HUD, buttons, modals)
  navigation/        Native stack
  state/             Zustand stores
  theme/             Design tokens — colours, spacing, timing
  services/
    auth/            Anonymous-first sign-in + recovery ladder
    coins/           CoinService interface + local implementation
    storage/         MMKV wrapper and key registry
    sync/            Fire-and-forget write queue + launch merge
    ads/ analytics/ purchases/ audio/    Not wired for v0.1

assets/game/…       Sprites, by PRD §18 naming
tools/level-tools/  Build-time level validation
__tests__/engine/   Engine unit tests
```

---

## The engine is pure, and that is load-bearing

Every engine function takes a `GameState` and returns a new one. No mutation,
no React, no native dependency.

```ts
const result = applyMove(state, 'car-1');
// state is untouched; result.state is new
```

This single constraint is what makes four separate features nearly free:

| Feature | How purity gives it to you |
|---|---|
| Undo | A stack of prior states. Nothing to reverse. |
| Solver | A* over the same immutable movement transitions. |
| Hints | The solver, run from the current board. |
| Tests | Call functions directly — no renderer, no mocks. |

**The rule that protects all of it:** `applyMove` must never mutate its input.
One in-place mutation silently corrupts undo history *and* the solver frontier,
and the resulting bug is very hard to trace back to its cause.

---

## The render path, and what must stay off the JS thread

This is the part most likely to be got wrong, so it is stated explicitly.

**Three separate things, three different homes:**

| Thing | Lives in | Updated |
|---|---|---|
| Logical board (where a car *is*) | `gameStore` | Once per move |
| Animation (where it is *mid-flight*) | Reanimated shared values | Every frame, UI thread |
| Pixels | Skia canvas | Every frame, GPU |

A swipe resolves like this:

```
Gesture (UI thread, gesture-handler)
   ↓
Ask the engine: is this legal, how far?     ← JS, once
   ↓
Commit the new logical state to gameStore   ← JS, once
   ↓
Drive a Reanimated shared value             ← UI thread, per frame
   ↓
Skia redraws from that shared value         ← GPU, per frame
```

**Hard rule: no per-frame value ever enters a Zustand store.** Zustand writes
run on the JS thread. A write per frame puts JS on the critical path and drops
frames — precisely the latency this project is meant to avoid. The store learns
where the car ended up; it never learns where it was halfway there.

Corollary: gesture callbacks that drive animation must be worklets, so a
dropped JS frame cannot stall the movement the player is watching.

---

## State: separate stores

| Store | Holds | Changes |
|---|---|---|
| `gameStore` | Board, history, hint | Several times per second while playing |
| `playerStore` | Coins, progress, premium | A few times per level |
| `settingsStore` | Sound, music, haptics | Rarely |
| `levelCatalogStore` | Bundled + cached downloadable campaign | On accepted content releases |

Split so a swipe cannot re-render the coin HUD. Sharing one store would make
that a matter of discipline; separate stores make it structurally impossible.

Always subscribe with a selector, never the whole store:

```ts
const coins = usePlayerStore(s => s.coins);        // re-renders on coins only
const { coins } = usePlayerStore();                // re-renders on everything
```

---

## Services own all I/O

No screen or component talks to Firestore, MMKV, the ad SDK or the store
directly. Everything goes through `src/services/`.

The payoff is concentrated in coins. `CoinService` is an interface, and the
current implementation is local-first. When coins are eventually sold for real
money and a server-authoritative ledger becomes mandatory, the swap happens in
one file and no gameplay code changes. See `DECISIONS.md` D-004.

### The coin write path

```ts
balance += n;
mmkv.set('coins', balance);   // synchronous
render();                     // tap fully resolved here
queueSync(balance);           // fire-and-forget
```

Writing to Firestore is not what costs latency — **awaiting it is**. Never
`await` a coin write before updating the UI.

Two directions on two schedules, and conflating them loses coins:

- **Write (local → cloud):** continuous during play. Flushes on backgrounding,
  on level complete, and after ~2s idle.
- **Merge (cloud → local):** once per cold start, higher `syncVersion` wins.

---

## Adding a level

Compatible remote additions use the background delivery pipeline in
`src/services/levels/` and the reactive `levelCatalogStore`. See
`level-content/README.md` for preparing, validating and publishing a release.
The 1–50 bundled fallback remains pure data and works without the service.
The following steps apply to bundled levels:

1. Drop `levelNNN.json` in `src/game/levels/`.
2. Register it in `levels/index.ts`.
3. Run `npm run validate:levels`.

No engine change, ever. If a level needs something the engine cannot express,
the fix is a new field in the `Level` type — never a special case in a
component.

---

## Boundaries that must not blur

- Levels never contain hex colours — only palette keys resolved via `theme/`.
  Otherwise a skin swap means editing every level file.
- The engine never imports React or anything native.
- Rules live in exactly one place: the engine.
- Nothing awaits the network on a tap path.
- Per-frame values never enter a store.

## Release integration update (2026-10-26)

Campaign registry now bundles100 immutable JSON boards. `levels/progression.ts` owns chapter visibility and sequential access. Content v2 has a fixed bundled base100; legacy v1/base50 remains published separately. Renderer draws grids from data, caches decoded Skia images and owns independent exit timers. Native feedback preloads cues; no gameplay tap awaits network. Explicit Google recovery uses a durable pending marker to prevent syncing the wrong coin snapshot during a UID switch. See RELEASE_SIGNING.md and RELEASE_CHECKLIST.md for build and acceptance boundaries.

Performance update: supported vehicle shadow shapes share4 baked raster images; VehicleSprite/GameBoard use memoization with stable engine/layout/image references. Runtime artwork remains static WebP; `audit:assets` checks sizes, decoded-pixel budgets and native audio source parity in CI. See `release/performance/README.md` for measured inventory and profiling limits.

Daily rewards: `rewards/dailyPolicy.ts` is pure calendar/streak logic. The coin service owns the award; `coins/dailyLedger.ts` persists a recoverable intent before changing balance/version/receipt. `playerStore` mirrors it for UI, and the existing background sync includes the receipt. Receipt merges never add coin balances. `useDailyRewardStatus` refreshes only on focus, foreground and local midnight. Daily uses existing art and no network on the claim path. Initial ad/skin prices live in `coins/economy.ts`; ad rewards remain disabled. Red Racer purchases use the shared durable coin transaction.


Awards: `services/awards/catalog.ts` defines ten stable IDs and rewards; pure policy evaluates bounded progress. Storage records unique perfect solves and the best observed daily streak. `awardService.ts` uses a durable synchronous MMKV claim journal; coin reads, startup, sync and account recovery repair it before any cloud balance comparison. The existing player save carries achievement facts and claim receipts, merged independently of balances. GameScreen records legitimate replay perfects separately from first-completion coins and excludes preview mode. AwardsScreen uses a virtualized native list and existing art/font. See AWARDS.md.


Garage: `shop/policy.ts` owns catalog/ownership normalization, `shopService.ts` owns synchronous purchase/equip, and `coins/transaction.ts` journals balance/version/inventory/history together. Startup, sync and account recovery repair pending transactions before comparing cloud balances. Existing player sync unions ownership and restores equipment, while history stays local and bounded to 200 entries. Rendering resolves the selected skin through the sprite registry and keeps rules unchanged. See SHOP.md.


Equipment correction: normalized Inventory.slots maps vehicle type:colour to owned catalog-defined replacements. Inventory.selected remains a compatibility mirror of car:red. Legacy category-wide selections are ignored and do not recolour the fleet. equippedSpriteKey resolves by original vehicle type/colour and the catalog replacement list for decoding, readiness and drawing. The store mirrors the slot snapshot; no per-frame writes. Durable transactions and the existing cloud snapshot include slots; no new backend or engine changes.


Ads: pure ads/policy owns ladder/pass rules, rewardService owns synchronous durable grants/purchases, coordinator owns preloaded fullscreen lifecycles and sdkAdapter owns deferred native SDK/consent. PlayerStore mirrors monetization metadata. The existing player document merges counters, receipts and expiry independently of version-winner balances. Results navigation shows only ready inventory and always continues on no-fill/failure. Music is suppressed for shown ads/consent forms. See ADS.md for native/configuration and accepted client-authority limits.

Asset readiness: Home schedules bounded warm-up after its background's onLoad and an idle callback. `warmVehicleImages` shares the board's decoded/in-flight registry; cancellation prevents scheduling further sprites after navigation. Android `GridLockAssets` sequentially fills Fresco's existing evictable bitmap cache for a small destination menu set. It never downloads debug/remote URLs, awaits nothing on a tap, and adds no startup gate. An Android rebuild is required for the native helper; no new dependency or iOS pod change.

Account deletion: `auth/deletionFlow.ts` sequences a durable cloud/auth/local journal through an injectable port; `accountDeletion.ts` binds Firebase/MMKV/stores. Sync and bootstrap check the journal before uploading/merging, and server rules lock deleted UIDs against late writes. The global AccountDeletionGate blocks play during retry and until local cleanup completes. The only retained server record is an immutable anti-resurrection UID/time marker. Auth deletion is separate from the cloud transaction, so partial failure explicitly stays pending. Deletion is an explicit account-management flow permitted to await network; gameplay paths remain synchronous.
