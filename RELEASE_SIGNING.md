# Android release signing

A private RSA upload key has been prepared locally in ignored `android/keystores/upload.p12`, with ignored `android/signing.properties`. Both files must be backed up securely outside this checkout. Do not paste their passwords into chat, commit them, or regenerate a key for an existing Play listing.

`python3 tools/prepare-android-signing.py` creates missing credentials only. Release builds fail without signing configuration and never fall back to the debug key.

Build from `android/`:

```sh
./gradlew :app:bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

CI can supply `GRIDLOCK_UPLOAD_STORE_FILE`, `GRIDLOCK_UPLOAD_STORE_PASSWORD`, `GRIDLOCK_UPLOAD_KEY_ALIAS`, `GRIDLOCK_UPLOAD_KEY_PASSWORD`. The file path is resolved relative to `android/app/` unless absolute. Keep all four in private CI configuration; never log them.

The local debug and upload SHA-1 fingerprints have been registered with Firebase and local Firebase configuration refreshed. Once Play App Signing is enabled, register the **Play app-signing certificate** SHA-1 too, then refresh Firebase configuration. The upload certificate alone does not identify the APK installed through Play.

`assembleQa` builds an offline minified emulator APK with debug signing and explicitly enabled preview hooks. It is for local QA only. `bundleRelease` disables those hooks and uses the upload key. Native feedback/OAuth/icon changes require rebuilding the native app. iOS simulator builds do not establish Apple distribution readiness.

For physical-device performance testing, `./gradlew :app:assemblePerformance` produces `android/app/build/outputs/apk/performance/app-performance.apk`. It has minification and an embedded JS bundle, is not debuggable, and disables all preview hooks. It uses the local debug certificate so it can replace a development install signed with the same certificate without an uninstall. It is for local testing, not store upload. If the installed app uses another signing certificate, do not uninstall merely to bypass the mismatch; protect/recover the save first. Production `bundleRelease` continues using the private upload key.


### Smaller ARM64 phone-test installer

The default performance build is universal (four CPU architectures,144.2MB in the2026-10-30 build). For the connected Samsung and other ARM64 devices, build only their architecture:

```sh
cd android
./gradlew :app:assemblePerformance -PreactNativeArchitectures=arm64-v8a
cp app/build/outputs/apk/performance/app-performance.apk app/build/outputs/apk/performance/app-performance-arm64.apk
```

Measured output:48,432,108 bytes (48.4MB). All1,060 asset/resource entries and the embedded JS bundle match the universal APK; the reduction comes from removing unused native architectures. The universal test APK is retained locally at `.local-artifacts/apk/app-universal-test.apk`. Native ARM64 emulator installation/startup is verified. This is a test installer using debug signing. Keep the ordinary `bundleRelease` command without this architecture override for the full release bundle; the project-wide architecture defaults remain unchanged.
