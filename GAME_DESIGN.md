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

Assistance costs coins. Reset restarts the puzzle on tap for 50 coins once the player has made a move. Replay from the results screen remains free.

| Action | Cost | Behaviour |
|---|---|---|
| Hint | 30 | Highlights a genuinely useful next move |
| Undo | 20 | Reverts one move |
| Reset | 50 | Restarts a puzzle in progress on tap |
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

Daily is a manual claim, once per device-local calendar date. Consecutive claims pay 20, 30, 40, 50, 60, 80, then 100 coins; Day 7 and every subsequent consecutive day pay 100. Missing a calendar date resets the next claim to Day 1 (20). Opening the app without claiming does not preserve the streak. Rewards become available at local midnight, not 24 hours after the prior claim.

Daily claims work offline, use a durable local intent to repair interrupted writes, and sync their last date/time/streak with the existing player save. Repeated taps cannot award twice. Backward clock/date changes cannot reopen a claim. This client-clock policy cannot provide global exactly-once awards across concurrently offline devices. Android coin packs use the direct checkout scope in D-034.

Planned rewarded ads pay 50 coins per completed ad, capped at 3 per day. No reward for a partial view; actual ad length comes from the provider. This is a policy/configuration only until the SDK and verified reward path are implemented.

Planned cosmetic prices: standard skin 300, special vehicle 900, themed pack 1,800. Default vehicles and their existing colours remain free. Skins preserve footprints, direction arrows and puzzle rules. Ads are not yet available. Red Racer is available for 300 earned coins; other skin prices remain planned. The first 100 level completions pay 1,000 coins total; a full first daily week pays 380. These are initial playtest prices, with no real-money exchange rate established.

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

## First-release campaign update (2026-10-26)

100 prepared levels ship offline. Show 1–50 initially, then reveal 51–100 after the first group is complete; existing Skip completion counts. Boards: 6×6 through59, 7×7 at60–79, 8×8 at80–100. Later sizes require a reviewed app change. The original closed-test build shipped free restart. See Assistance above for the current price. Daily rewards are available; Awards are implemented; Shop offers car, truck and bus skins, Inventory and local Coin History. Human difficulty calibration across the full campaign remains a launch acceptance task.

## Awards (2026-10-28)

Ten permanent, manually collected achievements. Five completion milestones(1/10/25/50/100 unique completed levels) pay25/50/100/150/300. Three perfect goals(1/5/10 different at-par-or-better wins) pay25/50/100. Daily-claim streak goals(3/7 days) pay50/100. Total one-time payout950 coins. Existing completions,including skips,count for completion milestones. Perfect history was not previously saved,so it starts with this update; replaying an old level can record its first perfect,but never counts twice. Skips and preview-mode wins do not record perfects. Daily goals preserve the best observed claim streak,seeded from the currently saved receipt; older lost streak history cannot be invented.

Awards are available offline and never block play. Home shows a dot when a reward is claimable; each reward is collected once from Awards. Local claims use a durable intent and receipts. Cloud sync unions perfect IDs/claimed award IDs and takes the highest daily streak,without adding coin balances. Existing account recovery still adopts cloud coins. This does not provide global exactly-once guarantees across concurrently offline devices; before selling currency,move reward authorization to a trusted ledger. No backend function,ad SDK or IAP is added for these basic achievements.


## Garage (2026-10-28)

Red Racer costs 300 earned coins once. Purchase and Equip are separate actions; Classic remains free. The equipped skin replaces red compact-car art only, preserving all palette cues, hitboxes and rules. Inventory previews owned cosmetics. Coin History shows the latest 200 device-local transactions from this update onward, including rewards, assistance and skin purchases; cloud balance restores are checkpoints, not earnings. See SHOP.md.


Equipment correction: Shop lists paid cosmetics and marks purchased items Owned. Inventory maintains an independent look per vehicle type and original level colour. All default colours coexist. A purchased red car cosmetic replaces only red cars; it must never recolour blue/yellow/other cars or red trucks/buses. A default selection resets only that slot. The erroneous category-wide colour overrides are discarded on migration; ownership is preserved. Pack definitions can declare several explicit replacement slots. Special vehicle identities, footprints and rules remain unchanged. Equip is free and creates no coin-history entry.


## Ads release economy (2026-10-28; supersedes planned D-018 values)

Coin rewarded ads pay10/15/20/25/35/50 for the first six each local day, then10 each without a claim cap. Only completed coin ads advance that ladder. Five separate completed pass ads give24 rolling hours without forced level ads; no coins for these views and partial progress is retained across days. Seven-day coin pass1000;30-day coin pass3000. Coin purchases extend existing expiry. Optional coin ads remain available during passes. Skip/developer preview have no level ad; normal win results offer a ready interstitial on Next/Replay/Home after every four completed real rounds (including replay wins), with immediate navigation on the other three or when no ad is ready. Device-local pacing survives restart; active-pass results reset it. No mid-puzzle or app-open ads, permanent purchase or real-money skin purchase is included.

### Level ratings and rewards

A solve at or under par earns three stars, one move over par earns two, and two or more moves over par earn one. A solved board without par earns one star. Keep each level’s best rating. Prior recorded perfect solves display three stars. Skips and older clears without move data are unrated. The results panel shows the actual coin award, including zero for replays and skips. The first unskipped completion still pays 10 coins. Awards ready to claim appear first, followed by in-progress awards and collected rewards.

### Offline chapters after level 100

Finishing level 99 prepares levels 101–120 in the background. Finishing level 100 opens 101, and the rest unlock one at a time. The same pattern continues at 119/120, 139/140 and later boundaries through level 2000. All additional levels use 8×8 boards with 12–14 vehicles. The existing skip, star and coin rules apply.
