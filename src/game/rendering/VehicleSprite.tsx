/**
 * A vehicle, drawn from primitives and animated on the UI thread.
 *
 * These are PLACEHOLDER shapes standing in for the final art (Phase 6,
 * ASSET_GUIDELINES.md). They deliberately follow the real art direction —
 * rounded, toy-like, lit from the top-left, grounded by a soft shadow — so the
 * board can be judged for feel now, and so swapping in real sprites later is a
 * change to this file alone.
 *
 * ANIMATION MODEL (ARCHITECTURE.md): the vehicle is always DRAWN at its
 * logical position. Motion is an offset that starts at "where it used to be"
 * and eases to zero. That inversion is what keeps per-frame values out of the
 * store entirely — the store commits the destination once, and Reanimated
 * interpolates the visual catch-up on the UI thread.
 */

import React, { useEffect, useRef } from 'react';
import {
  BlurMask,
  Group,
  Image as SkiaImage,
  RoundedRect,
  Path,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { DIRECTION_VECTORS, type Vehicle } from '../models/Vehicle';
import { Colors, Timing } from '../../theme/tokens';
import {
  EXIT_EASING,
  MOVE_EASING,
  SHAKE_EASING,
  SHAKE_FRACTION,
  moveDuration,
} from './animation';
import {
  arrowRotation,
  arrowSize,
  arrowStroke,
  makeArrowPath,
} from './arrow';
import { centerOf, vehicleRect, type BoardLayout } from './geometry';
import { spriteRotation } from './sprites';

type Props = {
  vehicle: Vehicle;
  layout: BoardLayout;
  /** Driving off the board. Rendered by GameBoard after the store dropped it. */
  exiting?: boolean;
  /** Changes to a new timestamp each time a tap on this vehicle was blocked. */
  blockedSignal?: number;
  /** The hint engine is pointing at this vehicle. */
  hinted?: boolean;
  /** Decoded sprite, loaded once per board by `useVehicleImages`. */
  sprite: SkImage;
};

export function VehicleSprite({
  vehicle,
  layout,
  exiting = false,
  blockedSignal = 0,
  hinted = false,
  sprite,
}: Props) {
  const r = vehicleRect(layout, vehicle);
  const c = centerOf(r);
  const radius = Math.round(layout.cellSize * 0.26);
  const { dx, dy } = DIRECTION_VECTORS[vehicle.direction];

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const previous = useRef({ x: r.x, y: r.y });

  // Move: snap the offset back to the old position, then ease it to zero.
  useEffect(() => {
    if (exiting) {
      return;
    }
    const deltaX = previous.current.x - r.x;
    const deltaY = previous.current.y - r.y;
    previous.current = { x: r.x, y: r.y };

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    const cells =
      Math.max(Math.abs(deltaX), Math.abs(deltaY)) / layout.cellSize;
    const duration = moveDuration(cells);

    offsetX.value = deltaX;
    offsetY.value = deltaY;
    offsetX.value = withTiming(0, { duration, easing: MOVE_EASING });
    offsetY.value = withTiming(0, { duration, easing: MOVE_EASING });
  }, [r.x, r.y, exiting, layout.cellSize, offsetX, offsetY]);

  // Exit: accelerate off the board and fade. Never decelerate into the edge.
  useEffect(() => {
    if (!exiting) {
      return;
    }
    const distance = layout.size + layout.cellSize;
    const config = { duration: Timing.exitMs, easing: EXIT_EASING };
    offsetX.value = withTiming(dx * distance, config);
    offsetY.value = withTiming(dy * distance, config);
    opacity.value = withTiming(0, { duration: Timing.exitMs });
  }, [exiting, dx, dy, layout.size, layout.cellSize, offsetX, offsetY, opacity]);

  // Blocked: a short nudge along the direction it wanted to go, then back.
  // It reads as the vehicle trying to move and failing — information, not an
  // error state (GAME_DESIGN.md).
  useEffect(() => {
    if (!blockedSignal) {
      return;
    }
    const amplitude = layout.cellSize * SHAKE_FRACTION;
    const step = Timing.bounceMs / 4;
    const nudge = withSequence(
      withTiming(amplitude, { duration: step, easing: SHAKE_EASING }),
      withTiming(-amplitude * 0.55, { duration: step, easing: SHAKE_EASING }),
      withTiming(amplitude * 0.25, { duration: step, easing: SHAKE_EASING }),
      withTiming(0, { duration: step, easing: SHAKE_EASING }),
    );
    if (dx !== 0) {
      offsetX.value = nudge;
    } else {
      offsetY.value = nudge;
    }
  }, [blockedSignal, dx, layout.cellSize, offsetX, offsetY]);

  // Hint: a soft pulsing glow, not a hard flash (DESIGN.md). Runs on the UI
  // thread and is cancelled explicitly — an un-cancelled infinite repeat keeps
  // the sprite animating after the hint is spent.
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!hinted) {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: 150 });
      return;
    }
    glow.value = withRepeat(
      withTiming(1, { duration: 650, easing: SHAKE_EASING }),
      -1,
      true,
    );
    return () => cancelAnimation(glow);
  }, [hinted, glow]);

  const glowOpacity = useDerivedValue(() => 0.25 + glow.value * 0.65);

  const transform = useDerivedValue(() => [
    { translateX: offsetX.value },
    { translateY: offsetY.value },
  ]);

  const shortSide = Math.min(r.width, r.height);
  const longSide = Math.max(r.width, r.height);


  const aSize = arrowSize(layout.cellSize);
  const aStroke = arrowStroke(layout.cellSize);
  const arrowPath = makeArrowPath(c.x, c.y, aSize);
  const shadowOffset = Math.max(2, layout.cellSize * 0.05);

  return (
    <Group transform={transform} opacity={opacity}>
      {/* Hint glow, drawn behind everything so it reads as light spilling out
          from under the vehicle rather than an outline drawn on top. */}
      {hinted ? (
        <RoundedRect
          x={r.x - layout.cellSize * 0.1}
          y={r.y - layout.cellSize * 0.1}
          width={r.width + layout.cellSize * 0.2}
          height={r.height + layout.cellSize * 0.2}
          r={radius * 1.3}
          color={Colors.hintGlow}
          opacity={glowOpacity}
          style="stroke"
          strokeWidth={Math.max(3, layout.cellSize * 0.09)}
        />
      ) : null}

      {/* Ambient shadow. Does most of the work of lifting the vehicle off the
          board — see DESIGN.md. Light comes from the top-left, so it falls
          down and right.

          It is BLURRED and inset from the footprint. A hard-edged rect at full
          footprint size reads as a tile painted under the car rather than a
          shadow cast by it, which is exactly how it looked before the blur. */}
      <Group>
        <RoundedRect
          x={r.x + r.width * 0.09 + shadowOffset * 0.6}
          y={r.y + r.height * 0.06 + shadowOffset}
          width={r.width * 0.82}
          height={r.height * 0.88}
          r={radius}
          color="#000000"
          opacity={0.32}
        />
        <BlurMask blur={Math.max(3, layout.cellSize * 0.07)} style="normal" />
      </Group>

      {/* The sprite is authored facing down, so it is drawn into an upright
          box the size of the vehicle's SHORT x LONG footprint and then rotated
          into place. A 2x1 car therefore uses the same asset as a 1x2 one. */}
      <Group
        origin={c}
        transform={[{ rotate: spriteRotation(vehicle.direction) }]}>
        <SkiaImage
          image={sprite}
          x={c.x - shortSide / 2}
          y={c.y - longSide / 2}
          width={shortSide}
          height={longSide}
          fit="fill"
        />
      </Group>

      {/* Arrow, rotated into the vehicle's direction. Drawn twice: a dark
          copy underneath keeps it legible on light body colours. */}
      <Group origin={c} transform={[{ rotate: arrowRotation(vehicle.direction) }]}>
        <Path
          path={arrowPath}
          style="stroke"
          strokeWidth={aStroke + 2}
          strokeCap="round"
          strokeJoin="round"
          color="#000000"
          opacity={0.22}
        />
        <Path
          path={arrowPath}
          style="stroke"
          strokeWidth={aStroke}
          strokeCap="round"
          strokeJoin="round"
          color="#FFFFFF"
        />
      </Group>
    </Group>
  );
}
