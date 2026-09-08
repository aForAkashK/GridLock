# Design

How the game and its UI look and feel. Art production rules are in
`ASSET_GUIDELINES.md`; behaviour is in `GAME_DESIGN.md`.

---

## Direction

**Premium cartoon / toy-like 2D.** Cute toy cars, rendered with the polish of a
commercial mobile puzzle game.

| It is | It is not |
|---|---|
| Rounded, chunky shapes | Flat SVG icon art |
| Soft ambient shadows | Hard drop shadows |
| Slight dimensional depth | Photorealism |
| Saturated but controlled colour | Neon or muddy palettes |
| Large readable silhouettes | Fine detail |
| Friendly, slightly exaggerated proportions | Accurate proportions |

The reference point is a well-made toy car photographed from above, not an icon
set.

---

## Perspective

Slightly elevated top-down — roughly three-quarter, not a pure orthographic
plan view. Vehicles should read as objects sitting *on* the board, not stickers
printed on it.

**The shadow does most of this work.** A soft, slightly offset ambient shadow
under each vehicle is what separates it from the road and makes flat 2D art
feel dimensional. It is not optional decoration.

Light comes from the **top-left**, consistently, in every asset. One
inconsistent shadow direction is immediately visible and makes the whole board
look assembled from different games.

---

## Colour

Tokens live in `src/theme/tokens.ts`. Nothing hardcodes a hex value, and level
JSON stores palette *keys* — so a skin swap never means editing level data.

### Vehicles

Six body colours, each with a shade for the darker planes and a shared glass
tint: red, blue, yellow, green, purple, orange.

They must be distinguishable at a glance **and by shape**, not colour alone —
roughly 1 in 12 men has some colour vision deficiency, and red/green is the
common axis. Vehicle length, silhouette and the direction arrow all carry
information independently of hue.

### Board

| Role | Token |
|---|---|
| Board background | `#3E4A56` |
| Road tile | `#55636F` |
| Road markings | `#F5F0E6` |
| Exit marker | `#F2D24B` |
| Hint glow | `#F2D24B` |
| Screen background | `#2C353F` |
| Coin | `#F2C230` |

The board is deliberately desaturated. Vehicles are the only saturated thing on
screen, so the eye goes to what the player can actually interact with.

---

## The vehicle

Each vehicle carries, from most to least important:

1. **Silhouette** — readable at thumbnail size. This is the primary identifier.
2. **Direction arrow** — where it will go. Never ambiguous.
3. **Body colour** — distinguishes it from neighbours.
4. **Shadow** — grounds it on the board.
5. **Windows and highlights** — sells the toy-like quality.

A vehicle occupying 2×1 cells is drawn to fill that footprint with a small
inset, so adjacent vehicles read as separate objects rather than a solid block.

### The arrow is the most important element

It is the only thing telling the player what a tap will do. It must be legible
at the smallest cell size on the smallest supported device, high-contrast
against the body colour, and unambiguous at a glance.

Arrows sit on the vehicle rather than beside it, so the association is
immediate.

---

## Motion

Timings in `theme/tokens.ts` under `Timing`; the reasoning is in
`GAME_DESIGN.md`.

| Event | Feel |
|---|---|
| Move | Accelerate away sharply, decelerate into the stop |
| Blocked | Short lateral shake, ~120ms, no displacement |
| Escape | Accelerate *off* the edge — never decelerate into it |
| Select | Slight scale up, ~1.04, immediate |
| Hint | Soft pulsing glow, not a hard flash |
| Coin change | Count up, never snap |

**Everything on screen animates. Nothing on screen waits.** Motion is feedback,
so it starts on the same frame as the touch. An animation that begins after a
network call or a state round-trip has already failed, however good it looks.

Skia draws the board; Reanimated drives the values on the UI thread. Nothing
per-frame goes through the JS thread — see `ARCHITECTURE.md`.

---

## Layout

### Home

Built against `UI/Home_UI.png`, over the background art in
`assets/ui/bg/home.png`.

```
 ⚙        🪙 1,250                    ← chrome, in the sky band
        [ art: logo + tagline ]
        [ art: city + vehicles ]

        ┌──────────────────┐
        │   ▶  PLAY        │          ← green pill, level as subtitle
        │   CONTINUE · L7  │
        └──────────────────┘

  LEVELS   DAILY   AWARDS   SHOP      ← 4 tiles; unbuilt ones read SOON
  ┌────────────────────────────┐
  │ 🏁 6 of 20 cleared    30%  │      ← progress banner
  └────────────────────────────┘
```

One obvious action. PLAY is the largest element on screen and needs no thought.

**The screen draws no title text.** Logo, tagline, skyline and vehicles are all
in the background art. Rendering a title in the layout would double it up.

**The art is 9:21 (821 x 1916) and drawn full-bleed with `cover`.** Being
taller than any common phone, `cover` only ever trims the flat sky band at the
top and the flat road at the bottom. It never crops horizontally, which is what
would clip the logo — the logo spans 16%-85% of the image width and has no
margin to lose.

**The Image MUST be given an explicit width and height.** With only
`position: absolute` and inset-0 it has no definite box to cover, so it falls
back to drawing at its intrinsic size treated as dp. On a 2.75-density screen
that renders 821 x 1916 as 2258 x 5269 px — a ~2.7x zoom showing only the
top-left corner. Size it from `useWindowDimensions`.

The giveaway when this regresses: the over-scale factor equals the device
pixel density almost exactly.

An earlier revision fitted a 2:3 version of the art to WIDTH and patched the
gaps with two coloured Views — a sky strip behind the status bar and road
colour below. The 9:21 export made both unnecessary; if the art is ever
re-exported at a shorter ratio, they come back.

Every colour in `Home` is sampled from these two files by patch median, not
chosen by eye.

### Tiles for features that do not exist

The reference shows Daily Challenge, Achievements, Vehicles, Shop, Go Premium
and a coin `+`. None are built, and the reference omits level select, which is.

Unbuilt tiles render dimmed with a **SOON** label and are genuinely inert —
the `disabled` case, not `affordable`: they are not gated on a balance, they
have not been written. A labelled tile tells the player what is coming; a
silent one reads as a broken UI.

The same rule killed a filled-but-empty chip used to balance the top bar. It
is transparent now: it still holds the layout, but no longer looks tappable.

### Game

```
┌─────────────────────────────┐
│  ←    Level 24     🪙 120   │
│                             │
│                             │
│        GAME BOARD           │
│         (square)            │
│                             │
│                             │
│   💡        ↩        🔄     │
└─────────────────────────────┘
```

**The board is the screen.** It gets the maximum square that fits between the
header and the action row, centred, with generous margin. Chrome stays out of
its way.

Actions sit at the bottom, in the thumb zone. The header is informational — a
tappable control at the top of a phone is a design error.

### Sizing

The board is square and scales to the smaller screen dimension. Cell size is
derived, never fixed:

```
cellSize = min(availableWidth, availableHeight) / gridSize
```

Minimum comfortable cell is 44pt so a vehicle is always a reliable touch
target. If a 6×6 board cannot reach that on the smallest supported device, the
board wins and the chrome shrinks.

---

## UI chrome

Chunky and tactile, matching the vehicles: rounded corners (`Radius.md`, 12pt),
soft shadow, visible press state with a scale-down.

Buttons showing a coin cost display it on the button — the player should never
tap to discover a price. When unaffordable, the button dims but stays visible
and tappable, leading to the coin-earning options rather than doing nothing.

---

## Accessibility

- **Never colour alone.** Shape, arrow and length all carry the same
  information.
- **44pt minimum touch target**, including the small action buttons.
- **Skia draws are invisible to screen readers.** Anything that must be
  announced needs an accessible RN view layered over the canvas — plan for it
  rather than retrofitting.
- **Respect reduce-motion.** Shorten movement toward the 150ms floor and drop
  particles; never remove the movement itself, since it is what shows the
  player what happened.
- **The game must be fully playable without precise gestures.** Tap-to-move is
  the primary control and swipe is an accelerator, not a requirement.

---

## Sound

Short, soft, toy-like. Never harsh.

| Event | Sound |
|---|---|
| Move | Soft whoosh, pitched by distance |
| Blocked | Gentle thud — informative, not punishing |
| Escape | Bright pop |
| Win | Short celebratory flourish |
| Coin | Light chime |

Sound is off-by-default territory for many players; the game must feel complete
in silence. Every audio cue is paired with a visual one.

Latency is the requirement: clips are preloaded at startup and never decoded on
demand. A move sound arriving 100ms late feels broken.
