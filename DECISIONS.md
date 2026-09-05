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

**Known limit.** This trusts the client. Acceptable while coins are only earned
through play. **Before coins are ever sold for money**, a server-side
append-only ledger with receipt validation is required — `CoinService` is an
interface (`src/services/coins/types.ts`) specifically so that swap does not
touch gameplay code.

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
