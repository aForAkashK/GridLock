/** Build Android artifacts and archive their exact diagnostic companions. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const targets = {
  aab: {
    task: "bundleRelease",
    variant: "release",
    architectures: "armeabi-v7a,arm64-v8a,x86,x86_64",
    artifact: "bundle/release/app-release.aab",
  },
  apk: {
    task: "assemblePerformance",
    variant: "performance",
    architectures: "arm64-v8a",
    artifact: "apk/performance/app-performance.apk",
  },
  qa: {
    task: "assembleQa",
    variant: "qa",
    architectures: "arm64-v8a",
    artifact: "apk/qa/app-qa.apk",
  },
  "release-apk": {
    task: "assembleRelease",
    variant: "release",
    architectures: "armeabi-v7a,arm64-v8a,x86,x86_64",
    artifact: "apk/release/app-release.apk",
  },
} as const;

const [name, ...options] = process.argv.slice(2);
if (name === "--help") {
  console.log(
    "Usage: node --import tsx tools/build-android.ts <aab|apk|qa|release-apk> [--offline]"
  );
  process.exit(0);
}
if (
  !name ||
  !(name in targets) ||
  options.some((option) => option !== "--offline")
) {
  console.error(
    "Choose aab, apk, qa or release-apk. Optional flag: --offline."
  );
  process.exit(1);
}
const target = targets[name as keyof typeof targets];

function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const args = [`:app:${target.task}`];
if (target.variant === "release")
  args.push(":app:archiveCrashlyticsSymbolsRelease");
args.push(`-PreactNativeArchitectures=${target.architectures}`, ...options);
run(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  args,
  resolve(root, "android")
);

const artifact = resolve(root, "android/app/build/outputs", target.artifact);
if (!existsSync(artifact)) {
  console.error(`Build finished without the expected artifact: ${artifact}`);
  process.exit(1);
}
const archiveArgs = [
  resolve(root, "tools/diagnostics/archive-android.mjs"),
  target.variant,
];
if (name === "release-apk") archiveArgs.push("--apk");
run(process.execPath, archiveArgs, root);
console.log(`Android artifact: ${artifact}`);
