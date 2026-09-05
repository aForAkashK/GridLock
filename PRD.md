# Freeway Escape — Product Requirements

What the product does and who it is for. Behaviour rules live in
`GAME_DESIGN.md`; visual rules live in `DESIGN.md`.

Source of record: `doc/Freeway Escape — Technical & Product Requirements
Document.md`. This file is the working summary; the source PRD wins on any
conflict of intent.

---

## What it is

A casual mobile puzzle game. The board holds vehicles, each locked to a single
direction. Tap or swipe one and it drives as far as it can. Moving one vehicle
unblocks another. The level is won when every vehicle has escaped.

**Core fantasy:** *Swipe. Clear. Escape.*

The puzzle is simple. The presentation is polished. That ordering is the
product principle — a satisfying swipe matters more than another mechanic.

---

## Who it is for

Casual players in 2–10 minute sessions. Someone who plays on a commute, in a
queue, before bed. They should understand the game within ten seconds of
opening it, with no tutorial text.

---

## Platforms

iOS and Android, from one React Native codebase.

---

## The loop

```
See puzzle → Think → Swipe → Vehicle moves → Board changes
    → "Ohhh!" → Swipe again → CLEAR 🎉
```

Everything else exists to serve that loop. Anything that interrupts it —
notably an ad — is a product bug.

---

## What ships when

### MVP v0.1 — is it fun?

Main menu · 20 levels · board · vehicles · swipe movement · collision · win
detection · reset · basic animation · coins · hint · undo · basic SFX.

Explicitly **not** in v0.1: shop, skins, obstacles, ads, analytics, IAP.

The question this version answers is whether the swipe feels good. If it does
not, no amount of content fixes it.

### v0.2 — does it retain?

50 levels · polished animation · particles · daily reward · rewarded ads ·
interstitials · analytics · difficulty balancing from real data.

### v1.0 — is it a product?

100+ levels · multiple environments · vehicle skins · remove-ads purchase ·
achievements · daily challenge · music · onboarding · store listing.

---

## Accounts

The player is signed in anonymously at first launch. **There is no login
screen, ever, as a condition of play.**

A real account is offered once — after level 10 or 500 coins — as a dismissible
"save your progress" prompt. Where the platform allows it, Play Games and Game
Center link silently with no UI at all.

Rationale and the failure modes this addresses are in `DECISIONS.md` D-003.

---

## Coins

Soft currency. Earned by playing, spent on assistance.

| Earn | | Spend | |
|---|---|---|---|
| Level complete | +10 | Hint | 30 |
| Daily reward | +50 | Undo | 20 |
| Rewarded ad | +30 | Reset | 10 |
| Achievement | +100 | Skip | 100 |

Tuned with analytics once v0.2 ships. Coins buy convenience, never advantage.

**Coins must never feel slow.** Spending is instant and local; the cloud sync
happens in the background. See `DECISIONS.md` D-004.

---

## Money

Free to play, start to finish. No level is paywalled.

- **Rewarded ads** — always optional, always the player's choice.
- **Interstitials** — at most every 3–4 completed levels, only on the
  level-complete screen. Never mid-level.
- **Remove Ads** — one-time purchase. No subscriptions.
- **Cosmetics** — skins and environments. Never affect gameplay.

Buying Remove Ads disables interstitials and banners. Rewarded ads remain,
because the player opts into those. Consider granting premium players the
equivalent reward without the ad.

---

## Success criteria

The prototype is working when:

1. A new player understands the game within 10 seconds.
2. A level takes 30–120 seconds.
3. Movement feels satisfying.
4. The game looks visually consistent.
5. Levels 1–10 teach the mechanic without text.
6. New levels need no engine change.
7. Ads never interrupt active play.
8. Monetization never feels pay-to-win.
9. Art can be replaced without touching gameplay code.

Criteria 6 and 9 are architectural and enforced by `ARCHITECTURE.md`. The rest
are judged by playing it.
