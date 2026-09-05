# Asset Guidelines

How art is produced, named and brought into the game.

---

## The rule that matters most

**AI agents do not create final art.** They consume it.

```
Agent's job:   Asset → Import → Position → Animate → Interact
Not:           Generate SVG → hope it looks good
```

Placeholder shapes for development are fine and expected — flat rounded
rectangles in the right colour and footprint. They must look obviously
provisional so nobody mistakes them for finished work.

Art direction, vehicle illustration and brand identity come from the art
pipeline, not from a model.

---

## Why consistency is the whole problem

The characteristic failure of AI-generated game art is that each asset is
generated independently, so six vehicles look like they came from five
different games. Individually fine, collectively incoherent — and the
incoherence is far more visible than any single asset's quality.

The fix is inheritance, not more prompting:

```
              ART BIBLE
                  │
                  ↓
            MASTER VEHICLE
                  │
      ┌───────┬───┴───┬───────┐
      ↓       ↓       ↓       ↓
     Taxi    Bus    Truck   Police
```

Every asset descends from one approved master. **Never generate a second
vehicle from a blank prompt.**

---

## The pipeline

### 1. Art bible — before any vehicle

Fix these once, in writing, with reference images:

- Perspective angle
- Outline thickness and colour
- Shadow shape, softness, offset
- Light direction (**top-left**, always)
- Vehicle proportions — wheel size, body-to-window ratio
- Highlight style
- Colour palette
- Arrow style
- Background and UI style

This is the visual contract for the whole game. Everything after it is
enforcement.

### 2. Master vehicle

Make **one** perfect vehicle: the red compact car. Iterate until it is right.
Nothing else starts before it is approved — every later asset inherits from it,
so a flaw here propagates through the entire set.

### 3. Derive the rest

Blue car → yellow car → green car → taxi → bus → truck. Each one references the
master, not the prompt.

### 4. Refine in Figma

Figma is the assembly tool: normalise colours, standardise shadows, build
arrows and icons, maintain tokens, export.

Suggested file — *Freeway Escape — Game Art Library*:

```
01 Art Bible   02 Vehicles    03 Environment  04 Obstacles  05 Arrows
06 UI          07 Icons       08 Animations   09 Effects    10 Export
```

---

## Generation prompt

Base prompt for the master. Later assets extend it with a reference image.

> Cute stylized mobile game vehicle, compact city car, top-down three-quarter
> view, toy-like proportions, rounded geometry, clean cartoon shapes, subtle
> thick outline, soft ambient shadow beneath vehicle, polished casual mobile
> game aesthetic, isolated object, transparent background, no text, no logo.

The wording matters less than reusing it unchanged across the set.

---

## Format

**PNG/WebP for vehicles.** Not SVG. Shadows, highlights and painterly detail
are far easier in raster, and SVG buys nothing here — the vehicles are never
recoloured at runtime.

**SVG only where it earns its place:** UI icons, simple shapes, logos.

### Resolution

Author at 4× display size and scale down. Cleaner edges, and headroom for
future device densities.

```
Display:  128 × 128
Source:   512 × 512
```

---

## Naming

Predictable and lowercase with underscores. The path is part of the contract —
loader code depends on it.

```
assets/
  game/
    vehicles/
      car/     car_red.webp, car_blue.webp, car_yellow.webp
      bus/     bus_blue.webp
      truck/   truck_red.webp
      taxi/    taxi_yellow.webp
    environment/  road_tile.webp, road_corner.webp, grass.webp, sidewalk.webp
    obstacles/    barrier.webp, cone.webp, roadblock.webp
    arrows/       arrow_up.webp, arrow_down.webp, arrow_left.webp, arrow_right.webp
    effects/      dust.webp, sparkle.webp, success.webp
  ui/
    icons/    buttons/    panels/
```

Colour names in filenames must match the palette keys in
`src/theme/tokens.ts` — `red`, `blue`, `yellow`, `green`, `purple`, `orange`.

---

## Acceptance checklist

No asset enters the repository until every line passes:

- [ ] Same perspective as the master
- [ ] Same outline style and thickness
- [ ] Same shadow style
- [ ] Light from the top-left
- [ ] Proportions consistent with the master
- [ ] Palette drawn from the approved colours
- [ ] Transparent background
- [ ] No text
- [ ] No watermark
- [ ] Correct dimensions (4× display)
- [ ] Correct filename and directory
- [ ] Readable at final display size — check at 128px, not at 512px

The last one catches the most. Assets are judged zoomed in and shipped zoomed
out.

---

## First set

Enough for a polished prototype. **Do not generate 100 assets.**

| Category | Assets |
|---|---|
| Vehicles | 3 cars, 1 bus, 1 truck, 1 taxi |
| Environment | road, grass, sidewalk, parking |
| Gameplay | 4 arrows, exit marker, selection indicator |
| UI | coin, hint, undo, reset, settings, play, pause |
| Effects | dust, sparkle, success burst |

---

## Integration

Assets are referenced through a resolver, never imported ad hoc across the
codebase. Swapping a skin or an environment must be a data change.

The test of whether this worked: replacing every placeholder with final art in
Phase 6 should require **no gameplay code change at all**. If it does, the
layer boundary leaked — that is the bug, not the art.
