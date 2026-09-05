/**
 * The board canvas — one Skia surface for the whole board.
 *
 * Everything is drawn into a single native view rather than one view per
 * vehicle, which is the reason Skia was chosen (DECISIONS.md D-001). Because
 * the canvas is one view, hit-testing is done in grid space rather than by
 * per-vehicle touch targets.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Vehicle } from '../models/Vehicle';
import type { Level } from '../models/Level';
import { Timing } from '../../theme/tokens';
import { Road } from './Road';
import { VehicleSprite } from './VehicleSprite';
import { createLayout, pxToCell } from './geometry';

/** Small grace period so the exit animation always finishes before unmount. */
const EXIT_GRACE_MS = 80;

type Props = {
  level: Level;
  /** Board edge length in px. The board is always square. */
  size: number;
  /** Live vehicles from the store; falls back to the level's start positions. */
  vehicles?: Vehicle[];
  /** Called with the grid cell the player tapped or swiped from. */
  onCellTap?: (x: number, y: number) => void;
  /** Timestamp of the last blocked attempt, for the shake. */
  blockedAt?: number;
  blockedVehicleId?: string | null;
  /** Vehicle the hint engine is pointing at, if any. */
  hintVehicleId?: string | null;
};

export function GameBoard({
  level,
  size,
  vehicles,
  onCellTap,
  blockedAt = 0,
  blockedVehicleId = null,
  hintVehicleId = null,
}: Props) {
  const layout = useMemo(
    () => createLayout(size, level.gridSize),
    [size, level.gridSize],
  );

  const toDraw = vehicles ?? level.vehicles;

  /**
   * Vehicles the engine has already removed but which are still driving off
   * screen. The engine is pure and drops an escaped vehicle immediately; the
   * renderer is what owns how long it remains visible. Keeping that here
   * rather than in the engine is the layer split doing its job.
   */
  const [exiting, setExiting] = useState<Vehicle[]>([]);
  const previous = useRef<Vehicle[]>(toDraw);

  useEffect(() => {
    const gone = previous.current.filter(
      p => !toDraw.some(v => v.id === p.id),
    );
    previous.current = toDraw;

    if (gone.length === 0) {
      return;
    }

    setExiting(current => [...current, ...gone]);
    const timer = setTimeout(() => {
      setExiting(current =>
        current.filter(v => !gone.some(g => g.id === v.id)),
      );
    }, Timing.exitMs + EXIT_GRACE_MS);

    return () => clearTimeout(timer);
  }, [toDraw]);

  const handleCell = useCallback(
    (px: number, py: number) => {
      if (!onCellTap) {
        return;
      }
      const cell = pxToCell(layout, px, py);
      if (cell) {
        onCellTap(cell.x, cell.y);
      }
    },
    [layout, onCellTap],
  );

  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);

  const gesture = useMemo(() => {
    // Both commit to the store, which is a JS-thread operation. They run once
    // per gesture, not per frame, so neither is on the render critical path
    // (ARCHITECTURE.md).
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(e => handleCell(e.x, e.y));

    // A vehicle has exactly one direction, so a swipe does not need to match
    // it — swiping anywhere on a vehicle means "go". That keeps the game
    // playable without precise gestures (PRD §7).
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(12)
      .onBegin(e => {
        swipeOrigin.current = { x: e.x, y: e.y };
      })
      .onEnd(() => {
        const origin = swipeOrigin.current;
        swipeOrigin.current = null;
        if (origin) {
          handleCell(origin.x, origin.y);
        }
      });

    // Pan wins if it activates; otherwise the tap fires.
    return Gesture.Exclusive(pan, tap);
  }, [handleCell]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width: size, height: size }}>
        <Canvas style={{ width: size, height: size }}>
          <Road layout={layout} />
          {toDraw.map(v => (
            <VehicleSprite
              key={v.id}
              vehicle={v}
              layout={layout}
              blockedSignal={blockedVehicleId === v.id ? blockedAt : 0}
              hinted={hintVehicleId === v.id}
            />
          ))}
          {exiting
            // An undo can bring a vehicle back while its exit is still
            // playing; the live copy wins.
            .filter(v => !toDraw.some(t => t.id === v.id))
            .map(v => (
              <VehicleSprite
                key={`exit-${v.id}`}
                vehicle={v}
                layout={layout}
                exiting
              />
            ))}
        </Canvas>
      </View>
    </GestureDetector>
  );
}
