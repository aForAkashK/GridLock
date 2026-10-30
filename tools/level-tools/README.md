# Level authoring

Generate candidate levels offline; the app never runs this tool on a tap.
The released 1–100 campaign and published IDs are preserved.

```sh
npm run generate:levels -- --help
npm run generate:levels -- --start 101 --count 5 --grid 8 --out generated-levels/batch-101
```

Defaults: 6×6, 10 vehicles, hard label, par 11–14, at least two initially
blocked vehicles, one extra move beyond vehicle count, two exit-only clearing
waves, design score ≥8, and worst sampled Node hint ≤6ms. `--difficulty` is a
label, not an automatically calibrated rating. Run `--help` for every option.

Candidates pass geometry, exact shortest-solution, design quality, node-budget
and sampled timing gates. Timing samples use the same optimal-path and
one-opening-detour positions as `npm run bench:hints`. This samples reachable
positions; it does not exhaust every player route or establish device latency.

The design score is:

```
initialBlocked + 3 * extraMoves + 2 * max(0, exitWaves - 1) + forcedMoves
```

`initialBlocked` counts vehicles with no legal movement, `immediateExits`
counts clear escapes, `extraMoves` is par minus vehicle count, and `forcedMoves`
counts positions with exactly one legal move along the selected optimal route.
`exitWaves` repeatedly removes currently clear exits until the board empties
or partial movement becomes necessary. These are transparent selection
heuristics, not a complete dependency model or proof of a unique solution.
Compare layouts in playtests before changing the difficulty curve.

A geometry key rejects rotations, renamed IDs, recolours and cosmetic type
swaps. It includes grid size, rectangles and directions; obstacle geometry is
reserved for future use. Current generation does not support obstacle rules.
Existing boards in `src/game/levels`, recursive `generated-levels` batches and
the current batch are excluded. Custom output directories elsewhere are not
scanned automatically.

Each exported JSON has `generation.version`, accepted `seed`, settings and
metrics. The manifest also records requested seed ranges and measured timings.
Each level tries consecutive seeds; batch levels receive disjoint ranges of
`--attempts` seeds. An exhausted search exits nonzero without writing the batch.
The output directory must be new. Existing shipped IDs are rejected.

To reproduce one accepted board, pass its ID, seed and settings, with
`--reproduce` and a new output directory. This mode makes one attempt, bypasses
ID/duplicate exclusion for that seed, and still refuses an existing output
directory. Keep generator version 1
code for exact reproduction. The timing gate may differ across machines;
no random state or wall-clock time is used to place vehicles.

`generated-levels/preview-51-55` supplied the original remote release and is now reused unchanged in the bundled 100-level campaign. Future additions start at 101 and use the v2 publishing workflow in `level-content/README.md`.

`build-campaign.ts` records the campaign generation profiles: 6×6 through 59, 7×7 from 60–79 and 8×8 from 80–100. The renderer draws its grid from level data. The generator remains an authoring tool, not a background server or player-side generation task.

Validate with typecheck, tests, `validate:levels`, `bench:hints` and both release catalogs before publishing. Automated checks do not replace human playtesting.

If a restricted shell blocks Watchman or the tsx CLI's IPC socket, equivalent
read-only checks are:

```sh
npm test -- --runInBand --watchman=false
node --import tsx tools/level-tools/validate-levels.ts
node --import tsx tools/level-tools/bench-hints.ts
node --import tsx tools/level-tools/generate-levels.ts --help
```
