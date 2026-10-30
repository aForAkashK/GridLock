/** RNFB 26.4 compatibility fix. Fail closed when upgrading; do not silently mispatch. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const base = resolve(root, "node_modules/@react-native-firebase/crashlytics");
const version = JSON.parse(
  readFileSync(resolve(base, "package.json"), "utf8")
).version;
if (version !== "26.4.0")
  throw new Error(`Review Crashlytics patches before using ${version}`);
const patches = [
  [
    "android/src/main/java/io/invertase/firebase/crashlytics/NativeRNFBTurboCrashlytics.java",
    "  public void setCrashlyticsCollectionEnabled(boolean enabled, Promise promise) {",
    '  public void setCrashlyticsCollectionEnabled(boolean enabled, Promise promise) {\n    // GridLock: apply persisted collection choice in the current native session.\n    FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(enabled);\n    if (!enabled) FirebaseCrashlytics.getInstance().setUserId("");',
  ],
  [
    "ios/RNFBCrashlytics/RNFBCrashlyticsModule.mm",
    '  [[RNFBPreferences shared] setBooleanValue:@"crashlytics_auto_collection_enabled"',
    '  // GridLock: apply persisted collection choice in the current native session.\n  [[FIRCrashlytics crashlytics] setCrashlyticsCollectionEnabled:enabled];\n  if (!enabled) [[FIRCrashlytics crashlytics] setUserID:@""];\n  [[RNFBPreferences shared] setBooleanValue:@"crashlytics_auto_collection_enabled"',
  ],
  ...["lib/handlers.ts", "dist/module/handlers.js"].map((path) => [
    path,
    "if (!nativeModule.isCrashlyticsCollectionEnabled) {",
    'if (!require("./index").getCrashlytics().isCrashlyticsCollectionEnabled) {',
  ]),
];
for (const [path, before, after] of patches) {
  const file = resolve(base, path);
  const source = readFileSync(file, "utf8");
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2)
    throw new Error(`Unexpected Crashlytics source: ${path}`);
  writeFileSync(file, source.replace(before, after));
}
console.log("Crashlytics 26.4 runtime-collection patches verified.");
