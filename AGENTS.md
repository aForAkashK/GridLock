# Rules for AI Agents

Applies to any AI agent working in this repository — Claude Code, Codex, or
otherwise. `CLAUDE.md` adds Claude-specific workflow on top of this.

---

## Read before writing

For any non-trivial change, read the docs that govern it:

| Working on | Read |
|---|---|
| Engine, state, services | `ARCHITECTURE.md`, `DECISIONS.md` |
| Anything visual | `DESIGN.md` |
| Rules, difficulty, economy | `GAME_DESIGN.md` |
| Picking up work | `TASKS.md` |
| Adding or editing art | `ASSET_GUIDELINES.md` |

`doc/Freeway Escape — Technical & Product Requirements Document.md` is the
original source PRD and remains the tiebreaker on product intent.

---

## The rules that matter most

**1. Never await the network on a tap path.**
Coins, progress and settings are written to MMKV synchronously and synced in
the background. If you write `await firestore()...` anywhere a user is waiting
on a tap, that is a bug regardless of how clean it looks. See `DECISIONS.md`
D-004.

**2. Never put per-frame values in a Zustand store.**
Store writes run on the JS thread. Animation belongs in Reanimated shared
values on the UI thread. The store holds where a vehicle *is*, never where it
is mid-flight.

**3. The engine stays pure.**
No React, no native imports, no mutation of inputs in `src/game/engine/`. Undo,
the solver and the hint system all depend on prior states staying intact.

**4. Rules live in exactly one place.**
If the renderer needs to know whether a move is legal, it calls the engine. A
rule implemented twice will drift.

**5. Do not create final art.**
Agents consume assets; they do not generate them. Placeholder shapes for
development are fine and must be obviously placeholder. See
`ASSET_GUIDELINES.md`.

**6. Levels are data.**
Adding a level means adding JSON and registering it. If you find yourself
special-casing a level in a component, stop — the `Level` type needs a new
field instead.

---

## Before you say something works

- `npx tsc --noEmit` passes.
- `npm test` passes.
- `npm run validate:levels` passes if you touched level data or the engine.
- You actually ran it. "Should work" is not a status.

Report honestly. If tests fail, say so and show the output. If you finished
three of four things, say which one you did not finish and why. Do not quietly
narrow scope and describe it as complete.

---

## Dependencies

Adding one is an architectural decision. Before adding a package, check that it
does not add startup or per-frame cost — the project's governing constraint is
that nothing introduces latency. Prefer no dependency, then a native module
with a JSI/Nitro path, then a JS library. Record anything notable in
`DECISIONS.md`.

Native modules need `pod install` and a rebuild, not just a Metro restart. If
you add one, say so explicitly so the human knows a rebuild is required.

---

## Scope

Do the task asked. If you spot an unrelated problem, mention it rather than
fixing it in the same change. If part of a task turns out to be blocked,
complete everything else and state plainly what was left and why — scaling work
down is the human's call.
