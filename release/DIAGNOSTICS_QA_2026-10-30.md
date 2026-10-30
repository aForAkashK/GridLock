# Diagnostics verification — 30 October 2026

## Passed

- TypeScript and ESLint pass.800 tests in38 suites pass, including metadata allowlisting, raw-message redaction, retained frame positions, bounded history, issue deduplication, offline classification, opt-out interval exclusion, SDK adapter failures, support-report content and identity rotation. Existing gameplay/coin/ad/dialog/inventory regressions remain green.
- Asset/audio/font audit passes; artwork remains2.37MiB encoded and the vehicle decode upper bound12.02MiB. No artwork was changed for diagnostics.
- Matching Crashlytics26.4 native package is installed. Android QA/performance builds succeed; the normal ARM64 APK is50.04MB decimal and was installed on the connected OnePlus using install-r. The phone was at NotificationShade/Launcher; no device unlock, save reset, reward claim, account deletion or deliberate crash was performed on it.
- Emulator controlled non-fatal report is written to Crashlytics persistence. Controlled native crash reaches the uncaught handler and is queued for submission. Relaunch logs show the Crashlytics report endpoint followed by HTTP200.
- Final JavaScript fatal test starts with native collection off, re-enables reporting through Settings in the same process, records the JS event, reaches React Native’s fatal handler, and finishes native exception persistence. Relaunch queues/submits the report; transport logs contain HTTP200. This exercises the RNFB current-session preference fix rather than relying only on persisted enabled state.
- A captured Hermes frame anonymous@1:2188887 resolves using the exact QA map to src/services/diagnostics/runtime.ts:140, the controlled throw site. A regenerated map from another build must not be substituted.
- Native Settings layout and voluntary report share sheet were inspected on the emulator. The report includes app/build/device/display/last game/sound context and recent actions, excludes the Firebase UID/email/cloud save, and was cancelled without sending. Reporting off produces native DISABLED-by-API logs; it was restored on afterward.
- Signed production AAB contains arm64-v8a,armeabi-v7a,x86,x86_64. jarsigner verifies the signature. Release R8 mapping upload completes. Native symbol generation and upload execute successfully with104 symbol files after correcting the AGP9 merged-library path; no NO-SOURCE shortcut is accepted as successful symbol upload. The bundle guard rejects a missing library tree.
- iOS static-framework pod install and ARM64 simulator Debug build succeed with Crashlytics and the current-session native setter patch. Debug/release targets emit dSYMs for the installed Crashlytics run script. This is a compile check, not a signed iOS device/production ingestion check.
- Updated privacy/support pages are deployed to the existing Firebase Hosting site. The public policy distinguishes the app-assigned Support code from provider-managed diagnostic identifiers and already-submitted data.
- Normal build restored on the emulator with extra test logging disabled; its original275 coins,14 completed levels and Continue level15 were verified unchanged. QA hooks remain unavailable in performance/release; no test crash control is shown to players.

## Release companions

Run npm run archive:diagnostics immediately after each final build. Timestamped ignored .local-artifacts/diagnostics archives contain exact binary/map companions and SHA-256 manifests; release also preserves generated native symbols. The uploader deletes its .sym intermediates, so a dedicated Gradle task preserves a104-file,32MiB ZIP before future uploads; this ZIP is also included in the current release archive. Current build revision is dirty, so artifact hashes and archived map contents are the reference. Back these private archives up before cleaning the workspace. Source maps/symbols are outside runtime assets.

Filtered test evidence: release/performance/diagnostics-verification-2026-10-30.log. Full diagnostic logs and source-map inputs are private temporary files. The SDK’s native initialization logs ranged27–173ms on the emulator while native builds were running; this is not a controlled startup benchmark. Diagnostics has native initialization/library cost even though JS context setup is deferred and gameplay never waits for reporting.

## Findings resolved during testing

The installed RNFB setter persisted the collection preference without applying it to the current native SDK, and the fatal JS handler read an immutable initial flag. A version-checked postinstall compatibility fix addresses both. The SDK direct-exit fatal path could exit before its queued JS event was persisted; retaining the original RN fatal handler chain produced durable JS/native capture. Related JS/native reports can describe the same incident and must be correlated.

A reused Gradle daemon initially exhausted512MiB metaspace. Fresh single-worker builds passed; final builds used1024MiB metaspace through a command-line override. The initial native-symbol source path followed an older AGP layout and yielded NO-SOURCE; it now includes mergeReleaseNativeLibs and has explicit producer dependencies plus a bundle guard. Both symbol tasks subsequently executed and the upload completed. The iOS generic simulator build was retargeted to ARM64 and completed from its cache. These build-tool findings are not gameplay crashes.

## Owner acceptance still required

Open Firebase Console for gridlock-bee41 → Crashlytics → Android com.akssoft.gridlock and confirm the identifiable QA test issues, custom keys/logs and support label. Browser console access was unavailable in this session, so SDK upload/HTTP200 is not represented as dashboard verification. Select and verify the intended alert recipients; no alert emails or support messages were sent by the agent. Review Play Data safety diagnostics/SDK identifier declarations before publishing. Actual iOS device reporting/signing remains separate from the simulator compile check.

Operational instructions and limitations: release/DIAGNOSTICS.md.
