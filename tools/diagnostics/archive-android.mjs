/** Archive exact symbol/source-map companions. Never bundle them as game assets. */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const variant = process.argv[2] ?? "release";
if (!["release", "performance", "qa"].includes(variant))
  throw new Error("Use release, performance or qa");
const required = [
  `android/app/build/generated/sourcemaps/react/${variant}/index.android.bundle.map`,
  `android/app/build/outputs/mapping/${variant}/mapping.txt`,
  variant === "release"
    ? "android/app/build/outputs/bundle/release/app-release.aab"
    : `android/app/build/outputs/apk/${variant}/app-${variant}.apk`,
];
for (const path of required)
  if (!existsSync(resolve(root, path)))
    throw new Error(`Build ${variant} first: missing ${path}`);
const generatedAt = new Date().toISOString();
const destination = resolve(
  root,
  ".local-artifacts/diagnostics",
  `${generatedAt.replace(/[:.]/g, "-")}-${variant}`
);
mkdirSync(destination, { recursive: true });
const optional = [
  `android/app/build/outputs/native-debug-symbols/${variant}/crashlytics-native-symbols.zip`,
  `android/app/build/outputs/mapping/${variant}/configuration.txt`,
  `android/app/build/outputs/native-debug-symbols/${variant}/native-debug-symbols.zip`,
];
const files = [
  ...required,
  ...optional.filter((path) => existsSync(resolve(root, path))),
].map((path) => {
  const data = readFileSync(resolve(root, path));
  const hash = createHash("sha256").update(data).digest("hex");
  const relative = path.replace("android/app/build/", "");
  const target = resolve(destination, relative);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(resolve(root, path), target);
  return { path: relative, sha256: hash, bytes: data.byteLength };
});
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const manifest = {
  generatedAt,
  variant,
  revision: git("rev-parse", "HEAD"),
  dirty: Boolean(git("status", "--porcelain")),
  files,
  warning:
    "Run immediately after the intended build. Match the APK/AAB SHA-256 before using these maps. Never upload an old archive for a newer binary.",
};
writeFileSync(
  resolve(destination, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);
console.log(destination);
