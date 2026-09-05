# Claude-Specific Instructions

Read `AGENTS.md` first — it holds the rules that apply to every agent. This
file covers how to work in this repo specifically.

---

## Orientation

Freeway Escape (package name `GridLock`) is a React Native grid puzzle game.
Vehicles have a fixed direction; the player works out the order to move them so
every vehicle escapes the board.

Bare React Native 0.87 — **not Expo**. Board rendered with Skia, animated with
Reanimated, state in Zustand, persistence in MMKV, backend Firebase.

Current status: structure and documentation complete, engine not implemented.
`TASKS.md` has the ordered backlog.

---

## Where things are

| Need | Path |
|---|---|
| Game rules | `src/game/engine/` |
| Types | `src/game/models/` |
| Level data | `src/game/levels/` |
| Skia drawing | `src/game/rendering/` |
| Zustand stores | `src/state/` |
| Firebase, coins, storage | `src/services/` |
| Colours, spacing, timing | `src/theme/tokens.ts` |

Unimplemented functions throw `Not implemented` and carry a `TODO(area):`
comment. That is deliberate — a stub that silently returns a default would let
a bug hide. Keep that pattern.

---

## Commands

```bash
npm start                  # Metro
npm run ios                # build + run iOS
npm run android            # build + run Android
npm run verify             # typecheck + lint + tests + level gate — run this
                           # before claiming done
npm test                   # Jest
npm run lint               # ESLint
npx tsc --noEmit           # typecheck
npm run bench:hints        # hint latency (timing-sensitive, see note below)
npm run validate:levels    # level solvability gate
npm run pods               # iOS pods (sets USE_FRAMEWORKS=static)
adb shell pm grant com.akssoft.gridlock android.permission.ACCESS_LOCAL_NETWORK
                           # after a fresh Android install — see traps below
```

Use the globally installed `pod` (1.16.2). `bundle exec pod` does not work here
— the Gemfile's gems were never installed.

---

## Working style for this repo

**Match the existing comment style.** Files here explain *why*, not *what*.
`// increment the balance` is noise; a comment explaining why a write is not
awaited is worth keeping.

**Check `DECISIONS.md` before changing an architectural choice.** If you think
one is wrong, say so and explain why rather than quietly working around it. If
you make a new architectural decision, add an entry — the reasoning is the
valuable part.

**Prefer editing over creating.** The structure exists; fill it in rather than
adding parallel files.

**When a task touches performance,** state which thread the work lands on. "The
gesture handler runs as a worklet on the UI thread" is the kind of detail that
matters here.

---

## Traps specific to this project

- **`react-native-worklets/plugin` must stay last** in `babel.config.js`.
  Reanimated 4 moved the transform out of `react-native-reanimated/plugin`.
- **`react-native-gesture-handler` must be the first import** in `index.js`.
- **Nitro Modules must be a direct dependency.** MMKV v4 needs it, but
  autolinking does not pick it up transitively — iOS fails with `Unable to find
  a specification for NitroModules`.
- **iOS pods must be installed with `npm run pods`**, which sets
  `USE_FRAMEWORKS=static`. A bare `pod install` silently falls back to static
  libraries and Firebase fails to build with `'FirebaseAuth/FirebaseAuth-Swift.h'
  file not found`. See `DECISIONS.md` D-008.
- **`$RNFirebaseDisableSPM = true`** is set in the Podfile on purpose. Do not
  switch to dynamic frameworks to fix a Firebase pod error without reading
  D-007 and D-008 — it trades app-launch time for convenience.
- **`applicationId` (`com.akssoft.gridlock`) differs from `namespace`
  (`com.gridlock`)** in `android/app/build.gradle`. That is deliberate: the
  Firebase project registers the app under the former, and google-services
  matches on `applicationId`. Do not "fix" the mismatch.
- **`google-services.json` and `GoogleService-Info.plist` are not committed.**
  Firebase calls will fail until they are added locally.
- **The Android launch permission prompt is debug-only. Do NOT "fix" it.**
  On a debug build, Android 16+ shows *"Allow GridLock to find, connect to, and
  determine the relative position of nearby devices?"*. That is
  `ACCESS_LOCAL_NETWORK`, declared by React Native's own **debug** manifest
  (`react-android-<version>-debug`) so the app can reach the Metro dev server.

  It is **absent from the release manifest** — verified with
  `./gradlew :app:processReleaseMainManifest`, which yields only `INTERNET`,
  `ACCESS_NETWORK_STATE`, `WAKE_LOCK` and `READ_GSERVICES`, all normal
  install-time permissions that never prompt. Players never see it.

  **Grant it during development.** Denying it breaks the dev loop — the app
  cannot reach Metro and you get "Unable to load script". Either tap Allow, or
  grant it headlessly:

  ```
  adb shell pm grant com.akssoft.gridlock android.permission.ACCESS_LOCAL_NETWORK
  ```

  `adb reverse tcp:8081 tcp:8081` does NOT reliably avoid the prompt: RN on an
  emulator reaches the host through `10.0.2.2`, not loopback, so the reverse
  tunnel is not what the bundle request travels over. (Tested — it appeared to
  work once and then did not.)

  Never strip it with `tools:node="remove"`: that breaks debug builds to fix a
  problem that does not reach production.

---

## On `bench:hints`

It measures wall-clock time, so it moves with machine load — the same code has
reported 1.6ms and 6.2ms on this machine depending on whether an emulator was
running. It takes the minimum of five runs to damp that, but treat a single
number as an estimate, not a measurement. The deterministic gate is the node
count in `validateLevel`; the benchmark is the sanity check on top of it.

## Driving the app over adb

Do not guess tap coordinates from a screenshot — screen pixels, layout dp and
safe-area insets do not line up, and a near-miss looks identical to a bug in
the handler. Dump the real hierarchy instead:

```
adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml
```

`clickable="true"` nodes with their `bounds` tell you what is actually
tappable. This is how the LogBox-toast obstruction below was found, after three
rounds of coordinate arithmetic went nowhere.

`LogBox.ignoreLogs(['DrawerLayoutAndroid is deprecated'])` in `App.tsx` exists
for that reason: react-navigation raises a deprecation RN 0.87 cannot satisfy,
and in dev the resulting toast sits on top of the action row and swallows every
tap on Hint/Undo/Reset. Do not blanket-disable LogBox to "fix" a similar issue
— silence the specific message so real warnings still surface.

## Do not

- Add a coin write that blocks the UI.
- Move animation state into a store.
- Generate final vehicle art.
- Hardcode a level into a component.
- Claim a build passes without running it.
