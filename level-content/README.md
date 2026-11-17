# Legacy hosted level catalogs

The current app automatically builds 8×8 chapters after level 100 from the
bundled V1 seed table. Players need one app update for this feature. No
Firebase publication is required for subsequent 20-level chapters. The
current app reserves IDs 101–2000 for this recipe and no longer checks the
v2 feed. The legacy hosting workflow below describes the older app only.

Players install the app update containing this feature once. After that,
compatible level releases arrive as JSON, without rebuilding the mobile app.
All 100 campaign levels are bundled and playable offline. This app reveals them in groups of 50. The current v2 feed is empty and reserves future IDs starting at 101.

## Player behavior

- The first screen reads bundled levels and the last good MMKV snapshot.
- A public HTTPS download runs independently of sign-in after the first render.
- Checks occur at launch, on foreground, and periodically while foregrounded.
  Successful requests are limited to once an hour; failed requests retry no
  sooner than five minutes. Each download has an eight-second timeout.
- Parsing, geometry checks and installation run at idle outside an active
  puzzle. If a download finishes during play, its text waits until the board
  is cleared or the player leaves the game screen.
- One atomic cache write precedes one catalog notification. Home progress,
  Continue, level selection and Next Level use the same reactive catalog.
  Existing board objects retain identity, so a catalog update cannot reset a
  puzzle or undo history. No tap waits for the network.
- Failed requests, incompatible data, stale CDN versions and failed cache
  writes retain the current campaign. Cached downloads work after an offline
  restart. A reinstall without the content cache needs one online download;
  the bundled campaign still works immediately.

Endpoint: https://gridlock-bee41-levels.web.app/levels/catalog-v2.json

Firebase project: `gridlock-bee41`; dedicated Hosting site:
`gridlock-bee41-levels`; deploy target: `hosting:levels`.
`firebase.json` serves only `level-content/public` with a five-minute CDN cache.
The existing default Hosting site, auth and player Firestore data are untouched.

## Publishing another batch

Generate new IDs after the final bundled/released level. For v2 revision 1 that
means starting at 101:

```sh
npm run generate:levels -- --start 101 --count 5 --grid 8 --out generated-levels/batch-101
npm run prepare:levels -- --from generated-levels/batch-101
npm run publish:levels
```

Playtest a candidate batch before publishing. Preparing a release automatically
increments the revision (or accepts `--revision N`), combines previously
released levels with the new batch and replaces the local catalog atomically
only after all checks pass. Deployment's predeploy hook rechecks every remote
level and compares the local cumulative catalog against the live catalog.
It refuses an older revision, an edited or removed puzzle, or changed content
under the same revision. If that live comparison cannot run, deployment stops.
Use one release branch/publisher at a time: predeploy comparison does not make
concurrent deployments an atomic compare-and-swap operation.

The gate uses the real solver and validator, exact par, rotated/cosmetic
layout deduplication and the same sampled 6ms Node hint gate as `bench:hints`.
A successful automated gate does not replace a device playtest or difficulty
calibration. Once delivered, a level ID is immutable. A corrected puzzle gets
a new ID; rolling back Hosting does not remove puzzles already cached by users.
Never edit published puzzles in place.

If Firebase authentication expires, run `firebase login --reauth`. No service
account keys or tokens belong in this repository. Firebase CLI is a developer
tool only; no additional app dependency or native pod is introduced.

## Contract and compatibility

`public/levels/catalog-v2.json` uses rulesVersion 2 and baseLevelId 100. Its contiguous remote levels begin at 101. V2 supports 6×6, 7×7 and 8×8 boards, bundled vehicle types/palettes, matching footprints and no obstacles. Only JSON is downloaded, never executable code or new assets. Runtime checks schema/geometry; publishing validates exact par, solvability, duplicates and sampled hint cost.

The immutable v1 channel remains rulesVersion 1/baseLevelId 50 with published 51–55 for older clients. Use `--channel 1` to verify or extend it; new clients use v2 by default. Deployment verifies both channels against live versions and preserves existing puzzles. Never repurpose a channel's bundled base or rules.

Limits remain 200 remote levels and 512 KiB per catalog. New mechanics, assets or larger boards need a compatible app update. More content eventually needs a paged protocol. Chapter visibility is separate from content availability: a cached level does not bypass sequential progression.

## Verification

```sh
npm run verify:level-release
npm run verify:level-release -- --remote
npm run verify
npm run bench:hints
```

In a sandbox that restricts tsx IPC or Watchman, equivalent local commands are:

```sh
node --import tsx tools/level-tools/release-levels.ts --verify
node --import tsx tools/level-tools/validate-levels.ts
node --import tsx tools/level-tools/bench-hints.ts
npm test -- --runInBand --watchman=false
```

Device checks after loading the new JS/app build:

1. New save shows 50 levels, even offline; after the first 50 completions, 51–100 appear.
2. Next/Continue preserve sequential gates across restarts.
3. Preview 60/80/100 on a device to check larger grids and actual taps.
4. Download an update while solving: the current board and undo stack remain.
5. Resume after a connection failure: the next eligible check installs content.
