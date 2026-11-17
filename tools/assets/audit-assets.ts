/** Build-time only: budgets apply to imported art, not editable source sheets. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { webpDimensions } from "./webp";
const root = process.cwd();
function files(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(folder, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const assets = new Set<string>();
const errors: string[] = [];
for (const file of [
  path.join(root, "App.tsx"),
  ...files(path.join(root, "src")),
].filter((candidate) => /\.[jt]sx?$/.test(candidate))) {
  for (const match of readFileSync(file, "utf8").matchAll(
    /require\(['"]([^'"]+)['"]\)/g
  )) {
    const asset = path.resolve(path.dirname(file), match[1]);
    if (asset.startsWith(path.join(root, "assets") + path.sep)) {
      assets.add(asset);
    }
  }
}
let encoded = 0,
  decoded = 0,
  sprites = 0;
const background: string[] = [];
for (const file of [...assets].sort()) {
  const name = path.relative(root, file);
  if (!file.endsWith(".webp")) {
    errors.push(`${name}: runtime artwork must be WebP`);
    continue;
  }
  const data = readFileSync(file);
  const { width, height } = webpDimensions(data);
  const rgba = width * height * 4;
  encoded += data.length;
  decoded += rgba;
  if (data.length > 512 * 1024) {
    errors.push(`${name}: exceeds512KiB encoded`);
  }
  if (Math.max(width, height) > 2048 || rgba > 6.5 * 1024 ** 2) {
    errors.push(`${name}: exceeds texture dimension/pixel budget`);
  }
  if (name.includes("game/vehicles/")) {
    sprites += rgba;
    if (Math.max(width, height) < 512) {
      errors.push(
        `${name}: vehicle source must be at least512px on its long edge`
      );
    }
    if (rgba > 768 * 1024) {
      errors.push(`${name}: vehicle exceeds768KiB decoded`);
    }
  } else if (!name.includes("ui/bg/") && rgba > 1.5 * 1024 ** 2) {
    errors.push(`${name}: UI texture exceeds1.5MiB decoded`);
  }
  if (name.includes("ui/bg/")) {
    background.push(
      `${path.basename(file)} ${width}×${height}: ${(rgba / 1024 ** 2).toFixed(
        2
      )}MiB decoded`
    );
  }
}
if (sprites > 16 * 1024 ** 2) {
  errors.push("Full vehicle registry exceeds 16 MiB decoded");
}
if (encoded > 4 * 1024 ** 2) {
  errors.push("Imported artwork exceeds4MiB encoded");
}
const hash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
let audio = 0;
for (const name of [
  "move",
  "blocked",
  "exit",
  "win",
  "coin",
  "tap",
  "toy_town",
]) {
  const music = name === "toy_town";
  const ext = music ? "m4a" : "wav";
  const source = path.join(root, `assets/audio/${name}.${ext}`);
  const bytes = statSync(source).size;
  audio += bytes;
  if (bytes > (music ? 384 : 64) * 1024) {
    errors.push(`${name}: audio budget exceeded`);
  }
  for (const copy of [
    `android/app/src/main/res/raw/gl_${music ? "bgm" : name}.${ext}`,
    `ios/GridLock/Audio/${name}.${ext}`,
  ]) {
    if (hash(source) !== hash(path.join(root, copy))) {
      errors.push(`${copy}: differs from audio source`);
    }
  }
}
const font = path.join(root, "assets/fonts/FredokaOne-Regular.ttf");
const fontBytes = statSync(font).size;
if (fontBytes > 64 * 1024) {
  errors.push("Daily display font exceeds64KiB");
}
for (const copy of [
  "android/app/src/main/assets/fonts/FredokaOne-Regular.ttf",
  "ios/GridLock/Fonts/FredokaOne-Regular.ttf",
]) {
  if (hash(font) !== hash(path.join(root, copy))) {
    errors.push(`${copy}: differs from font source`);
  }
}
for (const copy of [
  "android/app/src/main/assets/licenses/Fredoka-OFL.txt",
  "ios/GridLock/Fonts/OFL.txt",
]) {
  if (
    hash(path.join(root, "assets/fonts/OFL.txt")) !==
    hash(path.join(root, copy))
  ) {
    errors.push(`${copy}: font license missing or stale`);
  }
}
console.log(
  `Bundled display font: ${(fontBytes / 1024).toFixed(
    1
  )}KiB; native copies and license checked.`
);
console.log(
  `Imported WebP: ${assets.size}; encoded ${(encoded / 1024 ** 2).toFixed(
    2
  )}MiB; all images decoded ${(decoded / 1024 ** 2).toFixed(
    2
  )}MiB (not a live-memory measurement).`
);
console.log(
  `Full vehicle registry: ${(sprites / 1024 ** 2).toFixed(
    2
  )}MiB RGBA. Shipped audio: ${(audio / 1024).toFixed(0)}KiB.`
);
console.log(background.join("\n"));
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Asset budgets and native audio/font copies pass.");
}
