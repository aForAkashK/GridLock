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

## Daily rewards — reference-based cartoon UI (2026-10-26)

Use the clean city variant of `levels_bg.webp` (`city_bg.webp`), with the top Levels sign removed per the user’s newer request. The Daily header is a small transparent WebP calendar/title/cones graphic matched to the supplied reference. Reuse this clean city art for generic screens; preserve the original titled Levels background. A single static Skia surface paints the blue beveled frame, four-plus-three reward tiles and raised claim-button backing behind real native labels and controls. Gold amounts, green collected states and the highlighted current tile carry the hierarchy. The collected button remains legible gold rather than using a muddy opacity fade. Text, amounts, streaks and claim state stay live; only the fixed title artwork is baked. Layout measurements are local React state, never per-frame game-store writes. Small screens/large fonts scroll naturally.

### Daily typography refinement (2026-10-27)

Use the bundled Fredoka One display face for Daily streak headings,coin amounts,day labels and the claim button. Its regular cut is already rounded/heavy; do not synthesize extra bold. Keep small explanatory text in the system font. The gold collected button uses crisp dark-blue text; the green claim button uses dark-green text. Remove blurred button shadows and reduce amount-text depth so letters remain sharp. Button artwork/layout is retained for this typography-first iteration. Font and license are bundled natively,with no runtime download or font-loader package.

Collected Daily tiles use their green treatment and live collected-status labels; do not add checkmark glyphs to the reward cards (user preference,2026-10-27).

### Shared back navigation (2026-10-27)

All screens with back navigation use `BackButton` and `navigationAssets.back`,a glossy blue WebP derived from Home’s settings icon. The shared control is48 points with8-point hit slop and the same0.92 pressed scale as the settings icon. Screens supply safe-area positioning only; do not draw another grey box,chevron glyph or highlight behind it. Game,Levels,Daily,Settings and the Shop placeholder use this control. Home remains the root and retains its settings icon.


## Garage (2026-10-28)

Shop, Inventory and Coin History share one Garage screen with the existing home background, rounded navy cards, gold buttons, Fredoka display face, shared Back control and CoinPill. Previews use actual sprite artwork. Show the price before confirmation, then add ownership; Equip is explicit. Classic is always free. History shows signed amounts and resulting balances, with device-local/history-start boundaries in plain language. Do not sell existing free palette variants or change other vehicle colours.


### Shop reference revision (2026-10-28)

Replace large Garage list cards with the user's SHOP/cones reference: clean shared city background, a compact transparent title banner with live subtitle, Cars/Trucks/Buses tabs, navy outer panel, and a three-column grid of colour-matched cards with glossy gold/green controls. One static Skia canvas draws the grid backing. Native labels, images, previews and actions remain interactive. Preserve the six free classic palettes and the purchased Red Racer entitlement; show Red Racer separately at its catalog price. Small utility controls retain Inventory and Coin History. No ticks in equipped states. Use two columns for narrow screens or enlarged text.


### Shop and equipment separation — corrected (2026-10-28)

Shop contains sale cosmetics only, displaying price or Owned. Inventory has one independent default entry for each vehicle type/colour, plus owned replacements. Equipped/green means active for that exact slot; Equip/gold selects an alternative only within the same slot. Do not treat palette colours as mutually exclusive across a whole category. Red Racer overrides car:red only. Original mixed colours remain throughout the game.

Purchase confirmation follows the user's blue/cream cartoon reference using a static Skia frame, actual preview image, rounded display typography, real price and balance, blue Cancel, green Buy and red Close controls. Item and controls remain native and accessible; no text, prices or buttons are baked into a new image. Errors remain in the modal, hardware Back cancels, and purchase is separate from equip.


Shop subtitle alignment: preserve the title image's exact3:1 ratio. Position the live subtitle within the art's blue strip using proportional bounds (left/right7%,top69%,height20%), then center on both axes. Remove Android font padding and bottom-margin positioning. One-line fit keeps text inside the strip across widths without another raster asset.


## Coins & Ad-Free (2026-10-28)

Reuse the shared background, Back control, CoinPill, Fredoka headings and blue/gold cards. Enter from the coin+ information panel or Settings. Clearly separate coin rewards from the five-ad day pass; show current ladder reward, saved pass progress, expiry and exact coin-pass price before confirmation. No technical SDK callback wording belongs in player copy. Keep early-close/no-fill messages clear, Retry available, and optional ads explicit. Settings exposes native privacy choices. Test-only builds visibly identify test ads.


Coin+ entry copy (2026-10-29): title Your coins (or Not enough coins for an assist shortfall), with a neutral Coins & Ad-Free destination button. The entry must not tell players to watch ads or imply real-money coin purchases are available before billing is implemented. Reward/ad choices remain explicit inside the destination.

### Coin information popup reference (2026-10-29)

Use a blue beveled panel with an overlapping stack composed from the existing coin WebP, a live Fredoka title/balance, an inset level-reward strip, a glossy gold Coins & Ad-Free action and blue Got it action. One static gradient canvas per backing adds depth without new assets, animation or dependencies. Keep all amounts and labels native and accessible. Use a scrollable modal for compact screens and enlarged fonts, and let hardware Back dismiss it. Preserve insufficient-coin wording for gameplay assists and neutral destination copy.

Ad reward completion states (2026-10-29): coin ladder tiles show Completed in green after their saved daily claim, Next on the current step and Upcoming for later steps; completed bonuses remain visible until local midnight. Arrange tiles in a wrapping three-column grid so status labels fit. An active completed five-ad pass shows5/5, a full bar and a readable green Completed action. Show the actual expiry as the return time rather than promising a midnight reset; coin-bought/premium passes show active without inventing five completed ads. Coin rewards remain unlimited after the bonus ladder.

Settings layout correction (2026-10-29): a single centered,560-point-max scroll container owns horizontal padding and section gaps. Sound rows, volume, ad entries and account card share its bounds. Long labels shrink/wrap while values retain room; links wrap at narrow widths and large font scales. Use bundled Fredoka for the heading, shared Back and existing background. Settings exposes Email support and Request account deletion; the latter opens the dedicated public email-request instructions, not an immediate destructive action.

In-app deletion (2026-10-29): show a clearly labelled Delete account action within Save your progress, destructive confirmation listing lost game data, and Google identity verification for linked saves. Once started, a global pending/retry screen prevents further play; show success only after cloud save, Auth identity and local records are removed. Explain that the Google account remains intact and a minimal security marker is retained. Keep public request instructions for players without the app. No new art or dependency.

Deletion confirmation reference (2026-10-29): replace the platform alert with a red beveled modal, cream content panel, static warning/trash UI symbols, live Fredoka heading, emphasized permanence copy, blue Cancel and red Delete Permanently controls. Preserve all deletion disclosures, including Google account independence and minimal marker retention. Let warning copy scroll while Cancel/Delete remain visible; at compact widths or large font scales, stack the actions and omit the decorative trash symbol to preserve reading space. Hardware Back cancels. Guard repeat confirmation, and on iOS wait for modal dismissal before presenting Google reauthentication. Existing deletion/retry services remain unchanged. No new raster assets or dependencies.

Vehicle arrow refinement (2026-10-29): retain always-visible direction cues, with length reduced from0.52 to0.40 of a cell and stroke from0.085 to0.052 (minimum2 points). A thin1.4-point dark-blue outline at80% opacity separates the pale-white stroke from bright vehicle paint. Keep centered positioning, four-direction rotation and existing animation. This reveals more vehicle artwork without adding asset decoding or drawing passes.


Full UI review (2026-10-29): use pure viewport geometry in `screenLayout.ts` for gameplay and the painted Levels heading. Keep title/HUD clear of system chrome and restrict the Levels list viewport below its title. Menu scrolling clips below the top safe inset. Keep live Shop caption text inside its art band with fixed artwork-relative scaling; utility tabs wrap and have 44-point minimum height. Purchase backing follows the measured header and actions stack for compact/enlarged text. Bound win-label scaling inside painted slots. Result Home pops back to Home instead of retaining a completed game underneath it. See `release/QA_REVIEW_2026-10-29.md` for native evidence and remaining device acceptance.


Home Ad-Free shortcut (2026-10-30): place a compact gold button with a crossed-AD symbol and live Fredoka Ad-Free label beside the Settings icon. Keep the Settings/coins layout,48-point minimum target and explicit accessibility label/hint. Opens existing Coins & Ad-Free without auto-playing ads or buying passes. Icon uses static native views, adding no image decode or asset weight. Bound artwork-style label scaling so the header fits compact screens; normal and150% text layouts checked natively.


Real-device popup/inventory correction (2026-10-30): results must use a native Modal above gameplay, with400ms reveal and dismissal before navigation or ads. Hardware Back follows Home; guard duplicate actions. Keep a native modal node mounted through iOS dismissal. Inventory controls and card art consume the exact same frames from `components/shop/gridLayout.ts`; do not reintroduce an independent flex-wrapped foreground grid. Native OnePlus car/truck/bus cards now stay within matching backgrounds across both rows.
