# Game Design

How the game behaves. Rules precise enough to implement from, and the reasoning
behind the numbers.

---

## The board

A square grid, `gridSize × gridSize`. 6×6 for early levels; larger later.

Coordinates are cells, never pixels. `(0, 0)` is top-left, `y` grows downward.
The engine knows nothing about screen space — that is the renderer's job, and
it is what lets art change without touching rules.

## Vehicles

Occupies a `width × height` rectangle anchored at its top-left cell. Has
exactly one direction, fixed for the level's lifetime.

**Vehicles never turn and never reverse.** This is the constraint the whole
puzzle rests on. A vehicle's direction is a promise about the future, which is
what makes the board readable at a glance and the ordering problem interesting.

---

## Movement

Tap or swipe a vehicle and it drives along its direction as far as it can.

```
Is the next cell in my direction free?
  no  → blocked. Shake, play the blocked sound, no state change.
  yes → keep going until something blocks me, or I reach the edge.
          reached the edge → the vehicle escapes and leaves the board.
```

Two consequences worth stating plainly:

- **Movement is all-or-nothing.** A vehicle never stops halfway by choice. The
  player chooses *which* vehicle, never *how far*. That is what keeps the game
  a pure ordering puzzle rather than a positioning one.
- **A clear path to the edge means escape.** There is no separate exit tile in
  MVP. Any board edge the vehicle can reach is an exit.

### Blocked moves are feedback, not failure

A blocked tap costs nothing and is not punished. It is how players learn the
rules. It must feel like information — a short shake and a soft sound — never
like an error.

---

## Winning

Every vehicle has escaped. That is the only win condition in MVP.

**There is no lose condition.** No timer, no move limit, no failure state. A
player can always undo or reset. The tension comes from the puzzle, not from
punishment — this is a game played before bed.

A board can reach a state with no legal moves. That is a dead end, not a loss:
detect it, and offer Undo and Reset rather than a "you lose" screen.

---

## Feel

Everything in this section is what makes the game good. It is not polish to be
deferred.

### Movement timing

| Property | Value |
|---|---|
| Per cell travelled | ~55ms |
| Clamped between | 150ms and 350ms |
| Exit animation | 300ms |
| Landing bounce | 120ms |

Under 150ms reads as teleporting and the eye cannot follow which vehicle moved.
Over 350ms the player is waiting, and waiting compounds across a level. Longer
distances take longer, but sub-linearly — a five-cell move must not feel five
times as slow.

Easing should accelerate quickly and decelerate into a stop. A vehicle pulling
away sharply and settling is what sells the weight.

### The moment of escape

The single most satisfying event in the game. It deserves the most attention:
the vehicle accelerates off the edge rather than stopping at it, leaves a dust
puff, and the coin counter reacts.

### Response budget

| Event | Budget |
|---|---|
| Touch → vehicle starts moving | < 16ms (one frame) |
| Touch → blocked shake starts | < 16ms |
| Hint tap → vehicle highlighted | < 50ms |
| Level complete → modal | ~400ms (let the escape breathe) |

The first two are non-negotiable and are why gestures run as worklets on the UI
thread and coin writes never await the network.

---

## Difficulty

100 levels at v1.0, in five bands.

| Levels | Band | Introduces |
|---|---|---|
| 1–10 | Tutorial | Movement, direction, blocking, multiple vehicles |
| 11–25 | Beginner | More vehicles, longer vehicles, basic ordering |
| 26–50 | Intermediate | Dense boards, dependency chains |
| 51–75 | Advanced | Large vehicles, multiple exits, obstacles |
| 76–100 | Expert | Constrained boards, long chains |

### Levels 1–10 teach without text

Each of the first ten levels introduces exactly one idea and is nearly
unfailable. Level 1 should be solvable by a player who taps at random — the
goal is to teach that tapping moves things, not to challenge.

The teaching is structural: a level that can only be solved one way teaches
that ordering matters far better than a tooltip saying so.

### Difficulty is not vehicle count

A crowded board that solves in three moves is easy. A sparse board needing a
precise eight-move order is hard. Difficulty comes from **dependency depth** —
how far ahead the player must think — which is why the solver records
`parMoves` and why real difficulty ratings wait for v0.2 analytics.

---

## Assistance

All four are optional, purchasable with coins, and never required.

| Action | Cost | Behaviour |
|---|---|---|
| Hint | 30 | Highlights a genuinely useful next move |
| Undo | 20 | Reverts one move |
| Reset | 10 | Back to the level's starting state |
| Skip | 100 | Marks complete, moves on |

**A hint must be a real move, not a random highlight.** It runs the solver from
the *current* board, so it stays correct even after the player has wandered off
the intended path. A hint that suggests a useless move is worse than no hint —
it teaches the player that hints cannot be trusted, and they stop spending on
them.

Budget: a hint must resolve in under 50ms on a mid-range Android device. A
level whose search space exceeds that is too complex and the validator should
reject it rather than the game shipping a slow hint.

**Undo is unlimited and cheap.** It is what lets players experiment, and
experimenting is how they learn. Charging heavily for it would make them play
timidly.

---

## Economy

Level completion pays 10. A hint costs 30. So roughly three levels fund one
hint — assistance is affordable but considered.

Starting balance is 100: enough for three hints, so a new player can afford to
be stuck without feeling poor.

Daily reward (50) exists to bring players back, not to fund play.

Numbers are provisional until v0.2 analytics show real hint usage and where
players actually get stuck.

---

## Level validation

No level ships without passing (PRD §27, enforced by
`tools/level-tools/validate-levels.ts`):

- At least one solution exists
- All coordinates in bounds
- No overlapping vehicles
- No duplicate ids
- Solution length is reasonable for its band
- Not trivially solvable in one move (except deliberate tutorial levels)

The solver produces `parMoves` at authoring time, which powers both star
ratings and the hint system.

---

## Explicitly out of scope for MVP

Architecture must permit these; v0.1 must not include them.

**Obstacles:** roadblocks, cones, barriers, buildings, traffic lights.
**Special vehicles:** ambulance, police, fire truck (as *mechanics* — they may
exist as art).
**Mechanics:** locked vehicles, one-way roads, teleporters, moving obstacles,
slippery vehicles, temporary roads, switch-gates.

The `Level` type already carries an optional `obstacles` field so adding them
later is a data change, not an engine rewrite.
