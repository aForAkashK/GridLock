# Crash and issue diagnostics

## Release coverage

Firebase Crashlytics is integrated using RNFB26.4.0, matching app/auth/Firestore. Android uses Crashlytics Gradle3.0.8 with release R8 mapping upload and native symbol upload. iOS autolinks the Crashlytics pod and upload script; release builds emit dSYMs. A native rebuild is required after installation. Debug builds do not upload reports; minified QA/performance and release builds do when the saved setting is on. Native collection starts disabled in firebase.json, then the app applies the local preference after first paint. Native crashes captured before that are eligible for submission on a later enabled launch.

The original React Native fatal handler remains chained so a fatal JS exception also reaches the native crash handler and is durably finalized. Depending on SDK grouping, a fatal JavaScript issue may have a related native/JS report; correlate them before counting distinct failures.

Captured: native crashes, JavaScript fatal exceptions and unhandled promise failures through RNFB; React rendering failures through a recovery boundary; selected caught failures in sign-in/cloud loading, save writes, level delivery, sprite decoding, audio preload and account deletion. Known Firebase offline/cancel codes remain breadcrumbs. Reports are asynchronous and never gate gameplay. No per-frame recording, session replay, screenshots or additional Analytics/Performance SDK is installed. Manual breadcrumbs supplement the crash SDK; Analytics-dependent dashboard metrics/alerts may be unavailable without Google Analytics.

Crashlytics is a diagnostic tool, not a guarantee that an app cannot crash or that every issue will be reported. ANR reporting depends on supported Android/SDK conditions; it is not a continuous JS/frame profiler. Some stripped third-party native libraries may still lack full source-level symbols. Visual, audio and reward complaints often need reproduction steps and a user-supplied screenshot/report.

## Information available

- Random device-local **Support code**, separate from Firebase Player ID; app version/build/type and platform/OS/device model.
- Current/last screen, level/grid, moves, remaining vehicles, game status, preview mode and previous-crash flag.
- Window dimensions, density/font scaling, sound/music/haptic preferences, audio preload readiness and music volume.
- Save-readiness and linked-account boolean, ad-open/close state, navigation, level loads/wins, moves and hint/undo/reset/skip actions, plus native completion-popup presentation and Next/Replay/Home actions.
- Up to50 sanitized recent actions in memory. Native log/context flushes are batched250ms; the newest unflushed action may be absent after a sudden native crash.
- Caught errors use stable scope + safe error code, preserve available stack-frame positions, and discard original SDK messages. Automatic fatal SDK reports still contain exception messages/stacks; never place secrets in thrown errors.

No application-added email, Firebase UID, Google credential, advertising ID, full save or full coin history is attached. Crashlytics maintains its own installation/session identifiers. Handled errors are deduplicated by scope/code and capped20 distinct reports per process session; this is intentionally not a complete event audit. Support-code correlation applies to one installation, not all devices on a Google account.

## When a player reports a problem

1. Ask for **Settings → Report a problem**, their description of what happened, steps, expected/actual result and an optional screenshot/video. They review and share the report themselves, preferably to akssoft.feedback@gmail.com; the app does not send an email automatically.
2. For account/save requests ask for **Player ID** separately. Do not confuse it with Support code. Never request passwords or Google tokens.
3. In [Firebase Crashlytics](https://console.firebase.google.com/project/gridlock-bee41/crashlytics), select Android com.akssoft.gridlock and the affected version. Review fatal/non-fatal issue lists, buildType, screen, levelId, device/OS, custom keys and logs. Use the Support code as the Crashlytics user identifier to correlate a supplied report where console filtering permits.
4. Group repeated cases, note the issue ID, affected version/device/level, frequency and reproduction. Reproduce using the same minified build/display settings. Use QA level previews to protect real saves.
5. Fix, reproduce the original steps, run checks, build a new versionCode and preserve its exact maps. Mark an issue resolved only after the verified build is available; watch for regressions.

Suggested priority: startup crash/save loss → urgent; repeated stuck completion or failed purchases/rewards → high; device-specific clipping/audio → normal unless widespread. Preserve the original save and report before attempting any reset.

## Alerts and console acceptance (owner setup)

Open Firebase Console → project alerts/settings → Crashlytics and enable relevant new fatal, ANR, non-fatal, regression and trending notifications for the people who should receive them. Verify each recipient’s project permissions and email preferences; do not assume all alerts are on by default. Analytics-dependent velocity metrics may require Google Analytics, deliberately not added here. See [Firebase alert setup](https://firebase.google.com/docs/crashlytics/alerts-default).

Confirm the controlled QA test issues appear in the console, check their Support code/custom keys and stack frames, and confirm an alert reaches the chosen recipient. Local SDK initialization, successful HTTP transport and successful compilation do not independently confirm dashboard ingestion or email delivery. QA tests are identifiable by buildType=qa and scope qa.nonfatal / Controlled QA JavaScript crash. Close those test issues after confirmation.

## Exact release maps

After the final Android bundle build, immediately run:

```sh
npm run archive:diagnostics -- release
```

This writes a timestamped ignored `.local-artifacts/diagnostics/` archive containing the AAB, Hermes map, R8 mapping, generated Crashlytics native-symbol ZIP (when available), optional AGP native-debug-symbol ZIP and a SHA-256 manifest with Git revision/dirty state. Copy it to private backed-up release storage before rebuilding/cleaning. Maps are not runtime assets and do not increase the installed game size. For QA/performance use the corresponding variant argument. A binary hash is the reference when several local builds share version1.0(1); always increment versionCode before each Play upload.

For an exported Hermes stack, use the map belonging to that exact artifact:

```sh
npx metro-symbolicate /absolute/archive/generated/sourcemaps/react/release/index.android.bundle.map < /private/tmp/stacktrace.txt
```

Do not use a freshly regenerated map or the Metro packager-only map. R8 mapping is uploaded by the release Gradle plugin; native symbol upload is enabled for release only. Run `:app:bundleRelease :app:uploadCrashlyticsSymbolFileRelease` without an ABI override for the shipping bundle. An archive task preserves the generated symbols ZIP before the uploader deletes its .sym intermediates. The AGP9 source path includes `release/mergeReleaseNativeLibs/out/lib`; a bundle guard rejects a missing merged library tree. Native-symbol/build-ID tasks depend on the merge task so clean builds also have inputs. Confirm symbol tasks actually execute rather than reporting NO-SOURCE. Preserve native intermediates/symbols for crash investigation when a vendor library’s symbols are incomplete. On iOS retain each signed `.xcarchive`, its dSYMs and the matching Hermes map generated with `SOURCEMAP_FILE`; an Android map cannot symbolicate an iOS bundle. See [React Native release symbolication](https://reactnative.dev/docs/debugging-release-builds).

## Collection, deletion and SDK compatibility

Settings → Automatic crash reports persists locally; disabling immediately disconnects the app’s remote sink, disables native submission, clears the SDK user label and requests deletion of pending unsent reports. Local in-memory support history remains available for voluntary sharing; actions/errors from an off interval are not replayed to the remote sink when reporting is enabled again. Production collection defaults on; ordinary dev builds remain off. Startup applies a pending-discard marker before re-enabling.

Successful in-app account deletion clears the diagnostic ring, clears/rotates the device-local Support code, disables automatic submission for the remainder of that process session, and requests deletion of unsent SDK reports. The next fresh launch belongs to a new player session. Already-submitted Crashlytics records are not deleted by deleting a Firestore player document or Firebase Auth user. Handle diagnostic-data requests separately using the supplied Support code and Firebase/provider retention/deletion controls; do not promise remote deletion from the game’s local cleanup. Updated privacy/support pages describing this behavior were deployed to the existing Firebase Hosting site on30October2026. Review Play Data safety answers for crash logs, diagnostics and SDK identifiers, using actual SDK data disclosures.

RNFB26.4.0 inspection found that its native collection setter only persisted the preference, and its JS fatal handler read an immutable initial enabled flag. `tools/diagnostics/patch-crashlytics.mjs`, run by postinstall, applies small version-checked Android/iOS setter and JS-handler fixes. This applies collection changes to the current native session and lets the JS handler follow the current preference. The script is idempotent and fails on unexpected sources/version. Review/remove it when upgrading RNFB. No manual node_modules edit is the source of truth.

## Controlled emulator tests

Only use a **QA build on an emulator**, never a production user’s phone:

```sh
adb -s emulator-5554 shell am force-stop com.akssoft.gridlock
adb -s emulator-5554 shell am start -W -n com.akssoft.gridlock/com.gridlock.MainActivity --ei preview_level 15 --es diagnostics_test nonfatal
```

Other QA-only values are `crash` (native) and `jscrash` (JavaScript), delayed3seconds. These deliberately terminate the emulator app. Relaunch **without** diagnostics_test afterward so the SDK can send the prior report. Do not clear app data: preview levels do not spend coins or mark real progress. Production/performance builds ignore these extras; no player-facing test-crash button exists.

For local evidence, enable only emulator logs with `adb -s emulator-5554 shell setprop log.tag.FirebaseCrashlytics DEBUG`, capture `adb ... logcat -d`, then look for report creation/submission and transport status. Logs are evidence, never instructions. Disable the extra debug logging after testing.

## Verification record

See the dated QA record appended after native tests. iOS pod installation alone is not an iOS signed-device test. Firebase console ingestion/alert delivery must be checked separately from local transport verification.
