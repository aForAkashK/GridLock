# Freeway Escape
## Technical & Product Requirements Document — v1.0

---

## 1. Product Overview

**Freeway Escape** is a casual mobile puzzle game where the player clears a crowded grid by moving vehicles in the direction indicated by their arrows.

The player must determine the correct order of movements so that vehicles can exit the board without colliding or becoming blocked.

### Core fantasy

> **Swipe. Clear. Escape.**

The game should feel:

- Simple to understand
- Satisfying to play
- Visually playful
- Increasingly challenging
- Easy to play in short sessions

The target experience is a casual puzzle game that can be played for 2–10 minutes at a time.

---

# 2. Core Gameplay

The board contains vehicles occupying one or more grid cells.

Every movable vehicle has a direction.

Example:

```text
┌───┬───┬───┬───┬───┐
│ → │   │ ↓ │   │   │
├───┼───┼───┼───┼───┤
│   │ ← │ → │   │   │
├───┼───┼───┼───┼───┤
│   │   │ ↑ │   │ ← │
├───┼───┼───┼───┼───┤
│   │   │   │   │   │
└───┴───┴───┴───┴───┘
```

The player swipes/taps a vehicle.

If its path is clear, it moves in its permitted direction and exits or advances.

Moving one vehicle may unblock another.

The level is completed when all required vehicles have escaped.

---

# 3. Target Platform

### Initial target

Mobile:

- Android
- iOS

### Recommended technology

**React Native**

Game rendering:

**Shopify React Native Skia**

Reason:

- Good fit for 2D rendering
- Hardware-accelerated rendering
- Animations
- Custom drawing
- Works naturally with React Native
- Allows us to keep the game logic in TypeScript

The game should not depend on DOM/CSS for the actual board.

---

# 4. Game Architecture

Separate the game into three major layers.

```text
                    GAME
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
    Game Logic     Renderer      UI
        │            │            │
        │            │            │
   Level State     Skia        React Native
   Collision       Sprites     Menus
   Movement        Animation   Coins
   Win/Loss        Effects     Shop
```

### Game Logic

Responsible for:

- Level state
- Vehicle positions
- Vehicle dimensions
- Direction
- Collision
- Movement validation
- Exit detection
- Win condition
- Move count
- Undo
- Hint
- Reset

### Renderer

Responsible for:

- Board
- Vehicles
- Roads
- Shadows
- Arrow indicators
- Particles
- Movement animations
- Exit animations

### UI

Responsible for:

- Level number
- Coins
- Pause
- Hint
- Undo
- Reset
- Skip
- Settings
- Shop
- Premium
- Level selection

---

# 5. Level Representation

Levels should be data-driven.

Do NOT hardcode individual levels into components.

Example:

```ts
type Direction = "up" | "down" | "left" | "right";

type Vehicle = {
  id: string;
  type: "car" | "bus" | "truck" | "taxi" | "ambulance";
  x: number;
  y: number;
  width: number;
  height: number;
  direction: Direction;
  color: string;
};

type Level = {
  id: number;
  gridSize: number;
  vehicles: Vehicle[];
  difficulty: "easy" | "medium" | "hard" | "expert";
};
```

Example level:

```json
{
  "id": 1,
  "gridSize": 6,
  "difficulty": "easy",
  "vehicles": [
    {
      "id": "car-1",
      "type": "car",
      "x": 1,
      "y": 2,
      "width": 2,
      "height": 1,
      "direction": "right"
    }
  ]
}
```

This allows hundreds or thousands of levels to be added without changing the game engine.

---

# 6. Movement System

A vehicle can move only when:

1. Its direction is valid.
2. The destination cells are free.
3. No obstacle blocks the path.
4. The movement does not violate a special level rule.

Movement should feel physical rather than instantaneous.

Recommended animation:

```text
Idle
  ↓
Player swipes
  ↓
Validate movement
  ↓
Vehicle accelerates slightly
  ↓
Vehicle moves
  ↓
Vehicle exits / stops
  ↓
Small bounce / particle effect
```

The movement should be quick and satisfying.

Target animation duration:

**150–350ms**

depending on distance.

---

# 7. Controls

Primary control:

**Swipe**

Example:

```text
Swipe →
Vehicle moves →
```

Tap can optionally select/highlight the vehicle.

Accessibility/fallback:

- Tap vehicle + directional action
- Undo button
- Reset button

The game must remain completely playable without requiring precise gestures.

---

# 8. Level Difficulty

Initial release should contain approximately **100 levels**.

### Levels 1–10 — Tutorial

Teach:

- Movement
- Directions
- Blocking
- Multiple vehicles

### Levels 11–25 — Beginner

Introduce:

- More vehicles
- Longer vehicles
- Basic ordering puzzles

### Levels 26–50 — Intermediate

Introduce:

- Dense boards
- More dependencies
- Vehicles blocking multiple routes

### Levels 51–75 — Advanced

Introduce:

- Larger vehicles
- Multiple exits
- Obstacles
- Special rules

### Levels 76–100 — Expert

Introduce:

- Highly constrained boards
- Long movement chains
- Multiple dependencies
- Limited mistakes

---

# 9. Future Gameplay Elements

These should NOT be implemented in the first MVP but the architecture should support them.

### Obstacles

- Roadblocks
- Cones
- Barriers
- Buildings
- Traffic lights

### Special vehicles

- Ambulance
- Police car
- Fire truck
- Bus
- Truck

### Special mechanics

- Locked vehicle
- One-way road
- Teleporter
- Moving obstacle
- Ice/slippery vehicle
- Temporary road
- Switch-controlled gate

---

# 10. Visual Direction

## Art style

The game should use:

### "Premium Cartoon / Toy-like 2D"

Characteristics:

- Rounded shapes
- Thick but subtle outlines
- Soft shadows
- Slight 3D depth
- Saturated but controlled colors
- Friendly proportions
- Large readable silhouettes
- Minimal realistic detail
- Slightly exaggerated vehicles

Think:

> **Cute toy cars + polished mobile puzzle game**

NOT:

> Generic flat SVG icons.

---

# 11. Camera / Perspective

Use a slightly elevated **top-down / 3D-ish perspective**.

Vehicles should not look completely flat.

Example visual hierarchy:

```text
       ┌───────────────┐
       │     🚗        │
       │   shadow      │
       └───────────────┘
```

Each vehicle should have:

- Main body
- Windows
- Wheels
- Highlights
- Shadow
- Direction arrow

The shadow is particularly important because it makes simple 2D assets feel more dimensional.

---

# 12. Asset Strategy

## IMPORTANT

Claude Code and Codex should NOT be responsible for creating the final art.

They should consume finalized assets.

Their job:

```text
Asset
 ↓
Import
 ↓
Position
 ↓
Animate
 ↓
Interact
```

Not:

```text
Generate SVG
 ↓
Hope it looks good
```

---

# 13. Recommended Asset Pipeline

Use a dedicated art workflow.

### Step 1 — Create Art Bible

Before generating 50 vehicles, define:

- Perspective
- Outline thickness
- Shadow style
- Color palette
- Vehicle proportions
- Highlight style
- Arrow style
- Background style
- UI style

This becomes the visual contract for the entire game.

---

### Step 2 — Create Master Vehicle

Create ONE perfect car first.

For example:

**Red compact car**

Once the style is approved, create:

- Blue car
- Yellow car
- Green car
- Taxi
- Bus
- Truck
- Ambulance
- Police car

All assets must follow the master.

---

### Step 3 — Generate Artwork

Use an image-generation tool for the initial concepts.

Prompt example:

> Cute stylized mobile game vehicle, compact city car, top-down three-quarter view, toy-like proportions, rounded geometry, clean cartoon shapes, subtle thick outline, soft ambient shadow beneath vehicle, polished casual mobile game aesthetic, isolated object, transparent background, no text, no logo.

The important part is that **the same art direction is reused for every asset**.

---

# 14. Do Not Generate Every Asset Independently

This is a major issue with AI-generated game assets.

If you generate:

```text
Car 1
Car 2
Car 3
Bus
Truck
Taxi
```

using separate prompts, they can look like they belong to five different games.

Instead:

```text
ART BIBLE
     │
     ↓
MASTER CAR
     │
 ┌───┼────┬────┐
 ↓   ↓    ↓    ↓
Taxi Bus Truck Police
```

Every asset inherits the same visual rules.

---

# 15. Figma as the Asset Assembly Tool

Figma can be extremely useful here.

Use it to:

- Refine generated assets
- Adjust colors
- Create consistent arrows
- Create shadows
- Create UI icons
- Create vehicle variants
- Create sprites
- Maintain design tokens
- Export PNG/WebP/SVG

The Figma file should effectively become:

**Freeway Escape — Game Art Library**

with pages:

```text
01 - Art Bible
02 - Vehicles
03 - Environment
04 - Obstacles
05 - Arrows
06 - UI
07 - Icons
08 - Animations
09 - Effects
10 - Export
```

---

# 16. Why PNG/WebP Instead of SVG?

SVG is excellent for:

- UI icons
- Simple shapes
- Logos
- Basic arrows

But the vehicles themselves don't need to be SVG.

For the game, use:

**PNG/WebP sprites**

Advantages:

- More artistic freedom
- Easier shadows
- Easier texture
- Easier highlights
- Better support for painterly/cartoon details
- Easier animations
- Less time fighting SVG limitations

Use SVG where it actually makes sense.

---

# 17. Asset Resolution

Create assets at a higher resolution than their display size.

For example:

```text
Game display:
128 × 128

Source asset:
512 × 512
```

Then scale down.

This gives cleaner edges and allows future device scaling.

Export:

```text
vehicle-car-red.webp
vehicle-car-blue.webp
vehicle-car-yellow.webp
```

and avoid putting text inside the sprite.

---

# 18. Asset Naming Convention

Use predictable names.

```text
assets/
  game/
    vehicles/
      car/
        car_red.webp
        car_blue.webp
        car_yellow.webp
      bus/
        bus_blue.webp
      truck/
        truck_red.webp

    environment/
      road_tile.webp
      road_corner.webp
      grass.webp
      sidewalk.webp

    obstacles/
      barrier.webp
      cone.webp
      roadblock.webp

    arrows/
      arrow_right.webp
      arrow_left.webp
      arrow_up.webp
      arrow_down.webp

    effects/
      dust.webp
      sparkle.webp
      success.webp

  ui/
    icons/
    buttons/
    panels/
```

---

# 19. Game UI

The UI should follow the same cartoon style.

Main screen:

```text
        FREEWAY ESCAPE

          [ PLAY ]

       🪙 1,250 coins

     Daily Challenge
     
   🏆 Achievements
     
     ⚙ Settings
```

Gameplay:

```text
┌─────────────────────────────┐
│ ←   Level 24       🪙 120   │
│                             │
│        GAME BOARD           │
│                             │
│                             │
│                             │
│                             │
│   💡       ↩       🔄       │
└─────────────────────────────┘
```

---

# 20. Coins

Coins are the game's soft currency.

### Earning

- Level completion: +10
- Daily reward: +50
- Rewarded advertisement: +30
- Achievement: +100

### Spending

- Hint: 30
- Undo: 20
- Reset: 10
- Skip: 100

The exact economy should be tuned using analytics.

---

# 21. Monetization

## Free Tier

Users can play the entire game for free.

Revenue comes from:

### Rewarded advertisements

Examples:

```text
Watch Ad → +30 coins

Watch Ad → Get Hint

Watch Ad → Continue
```

Rewarded ads should be optional.

---

## Interstitial advertisements

Do not show an advertisement after every level.

Initial rule:

**Show an interstitial approximately every 3–4 completed levels.**

Do not interrupt active gameplay.

---

## Premium

Initial premium strategy:

### Remove Ads

One-time purchase.

Potential second product:

### Premium Pack

Includes:

- Remove Ads
- Coins
- Exclusive skins
- Premium levels

Avoid subscriptions initially.

---

# 22. Cosmetic Monetization

Future:

### Vehicle skins

Examples:

- Sports Pack
- Police Pack
- Emergency Pack
- Taxi Pack
- Retro Pack
- Neon Pack

### Environments

- City
- Beach
- Desert
- Snow
- Night City
- Cyberpunk

Cosmetics should never provide gameplay advantages.

---

# 23. Ads + Premium Rule

If a user purchases Remove Ads:

Disable:

- Interstitial ads
- Banner ads

Keep:

- Optional rewarded ads

However, consider allowing premium users to receive equivalent rewards without watching ads.

The exact behavior should be validated with the chosen ad/monetization SDK and store policies.

---

# 24. Game State

Persist:

```ts
type PlayerState = {
  currentLevel: number;
  completedLevels: number[];
  coins: number;

  hints: number;
  undos: number;

  unlockedSkins: string[];

  selectedSkin: string;

  premium: boolean;

  dailyRewardClaimedAt?: string;
};
```

---

# 25. Undo System

Every move should generate a state snapshot.

```text
State 0
   ↓
Move
   ↓
State 1
   ↓
Move
   ↓
State 2
```

Undo:

```text
State 2
   ↓
UNDO
   ↓
State 1
```

Limit the number of stored states if memory becomes an issue.

---

# 26. Hint System

The hint engine should not simply highlight a random vehicle.

It should calculate a valid next move.

Example:

```text
Current board
     ↓
Find valid moves
     ↓
Evaluate possible states
     ↓
Choose useful move
     ↓
Highlight vehicle
```

Initially, a basic rule-based hint system is sufficient.

A sophisticated solver can be added later.

---

# 27. Level Validation

Every level must be validated before being shipped.

Validation should check:

- At least one solution exists
- No impossible vehicle configuration
- Valid vehicle coordinates
- No invalid overlap
- Valid exits
- Reasonable solution length

Ideally, create a level solver.

```text
Level Generator
      ↓
Solver
      ↓
Is solvable?
   ↙       ↘
 YES       NO
 ↓          ↓
Ship       Reject
```

---

# 28. Analytics

Track:

### Gameplay

- Level started
- Level completed
- Level failed
- Moves per level
- Hint used
- Undo used
- Reset used
- Skip used
- Time spent

### Monetization

- Rewarded ad watched
- Coins earned
- Coins spent
- Premium viewed
- Premium purchased

### Retention

- First session
- Day 1
- Day 3
- Day 7
- Day 30

This will tell us where players are getting stuck or losing interest.

---

# 29. MVP

The first version should NOT contain everything.

### MVP v0.1

Implement only:

- Main menu
- 20 levels
- Game board
- Vehicles
- Swipe movement
- Collision
- Win detection
- Reset
- Basic animations
- Coins
- Hint
- Undo
- Basic sound effects

No shop.

No skins.

No complicated obstacles.

No subscriptions.

No 100 levels yet.

---

# 30. MVP v0.2

Add:

- 50 levels
- Better animations
- Particle effects
- Daily reward
- Rewarded ads
- Interstitial ads
- Analytics
- Level difficulty balancing

---

# 31. Version 1.0

Target:

- 100+ levels
- Multiple environments
- Vehicle skins
- Premium/remove ads
- Achievements
- Daily challenge
- Sound/music
- Polished onboarding
- Store listing assets

---

# 32. Suggested Repository Structure

```text
src/
  game/
    engine/
      collision.ts
      movement.ts
      solver.ts
      levelValidator.ts

    models/
      Vehicle.ts
      Level.ts
      GameState.ts

    levels/
      level01.json
      level02.json

    rendering/
      GameBoard.tsx
      VehicleSprite.tsx
      Road.tsx
      Effects.tsx

  screens/
    HomeScreen.tsx
    GameScreen.tsx
    LevelSelectScreen.tsx
    ShopScreen.tsx
    SettingsScreen.tsx

  components/
    CoinCounter.tsx
    GameButton.tsx
    HintButton.tsx
    Vehicle.tsx

  services/
    ads/
    analytics/
    purchases/
    storage/

assets/
  game/
  ui/
  audio/
```

---

# 33. AI Development Workflow

Claude Code and Codex should primarily handle:

### Code

- Game engine
- Level engine
- Collision
- Solver
- State management
- Animations
- UI
- Analytics
- Ads integration
- Store integration
- Tests
- Build/deployment

### AI should NOT be the final authority for:

- Art direction
- Vehicle illustrations
- Final visual assets
- Brand identity

Those should come from the art pipeline.

---

# 34. AI Asset Workflow

Recommended workflow:

```text
              ART DIRECTION
                    │
                    ↓
                ART BIBLE
                    │
                    ↓
             MASTER VEHICLE
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
     Image generation       Figma
          │                   │
          └─────────┬─────────┘
                    ↓
             Final artwork
                    ↓
             PNG / WebP
                    ↓
              Game assets
                    ↓
             Claude / Codex
                    ↓
             Game integration
```

---

# 35. Asset Quality Rule

Before an asset enters the repository, it must satisfy:

- Same perspective
- Same outline style
- Same shadow style
- Same lighting direction
- Same proportions
- Same color philosophy
- Transparent background
- No text
- No watermark
- Correct dimensions
- Correct naming

---

# 36. Recommended First Art Set

Do NOT generate 100 assets.

Start with:

### Vehicles

- 3 cars
- 1 bus
- 1 truck
- 1 taxi

### Environment

- Road
- Grass
- Sidewalk
- Parking area

### Gameplay

- 4 directional arrows
- Exit marker
- Selection indicator

### UI

- Coin
- Hint
- Undo
- Reset
- Settings
- Play
- Pause

### Effects

- Dust
- Sparkle
- Success burst

That's enough to build the first polished prototype.

---

# 37. Success Criteria

The prototype is successful when:

1. A new user understands the game within 10 seconds.
2. A level can be completed within 30–120 seconds.
3. Vehicle movement feels satisfying.
4. The game looks visually consistent.
5. The first 10 levels progressively teach the mechanic.
6. The game can add new levels without changing engine code.
7. Ads never interrupt active gameplay.
8. Monetization doesn't make the game feel pay-to-win.
9. Assets can be replaced without changing gameplay code.

---

# 38. Product Principle

The most important rule:

> **The puzzle should be simple. The presentation should feel polished.**

We should not try to make the game technically complicated just to make it interesting.

The addictive loop should be:

```text
See puzzle
    ↓
Think
    ↓
Swipe
    ↓
Vehicle moves
    ↓
Satisfying animation
    ↓
Board changes
    ↓
"Ohhh!"
    ↓
Swipe again
    ↓
CLEAR 🎉
```

That feeling is more important than adding dozens of mechanics.

---

# 39. Initial Development Order

Build in this order:

### Phase 1
Game engine

### Phase 2
One playable level

### Phase 3
Movement + collision

### Phase 4
Win condition

### Phase 5
10 levels

### Phase 6
Polished vehicle assets

### Phase 7
Animations + effects

### Phase 8
Coins + hints + undo

### Phase 9
20–50 levels

### Phase 10
Ads

### Phase 11
Analytics

### Phase 12
Premium

### Phase 13
Skins + additional environments

### Phase 14
100+ levels

---

# 40. Final Product Vision

**Freeway Escape** should eventually feel like a small, polished commercial mobile game rather than an experimental coding project.

The player should see:

> 🚗 Cute vehicles  
> 🛣️ Beautiful little city environments  
> 👉 Clear directional feedback  
> 💨 Satisfying movement  
> ✨ Small visual effects  
> 🪙 Simple economy  
> 🧠 Increasingly clever puzzles

while underneath the hood we have:

> TypeScript + React Native + Skia + deterministic game engine + level solver + analytics + monetization.

The art system should remain completely independent from the game engine so that better artwork can be introduced later without rewriting gameplay.