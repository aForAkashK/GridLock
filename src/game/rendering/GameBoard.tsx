import { usePlayerStore } from "../../state/playerStore";
/**
 * The board canvas — one Skia surface for the whole board.
 *
 * Everything is drawn into a single native view rather than one view per
 * vehicle, which is the reason Skia was chosen (DECISIONS.md D-001). Because
 * the canvas is one view, hit-testing is done in grid space rather than by
 * per-vehicle touch targets.
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Canvas, Path, RoundedRect, Skia } from "@shopify/react-native-skia";
import { useReducedMotion } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { Vehicle } from "../models/Vehicle";
import type { Level } from "../models/Level";
import { Colors, Timing } from "../../theme/tokens";
import { createExitTracker } from "./exitTracker";
import { VehicleSprite } from "./VehicleSprite";
import { createLayout, pxToCell } from "./geometry";
import { equippedSpriteKey, useVehicleImages } from "./sprites";

/** Small grace period so the exit animation always finishes before unmount. */
const EXIT_GRACE_MS = 80;
const LAST_LEVEL_WITH_ARROWS = 10;

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

function GameBoardView({
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
    [size, level.gridSize]
  );

  const reducedMotion = useReducedMotion();
  const showDirectionArrows = level.id <= LAST_LEVEL_WITH_ARROWS;
  const toDraw = vehicles ?? level.vehicles;
  const skins = usePlayerStore((s) => s.equippedSkins);
  const resolveSprite = useCallback(
    (v: Vehicle) => equippedSpriteKey(v, skins),
    [skins]
  );
  const images = useVehicleImages(level.vehicles, skins);
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) {
        setScreenReader(value);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReader
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  const grid = useMemo(() => {
    const path = Skia.PathBuilder.Make();
    for (let cell = 1; cell < level.gridSize; cell++) {
      const coordinate = cell * layout.cellSize;
      path.moveTo(coordinate, 0);
      path.lineTo(coordinate, size);
      path.moveTo(0, coordinate);
      path.lineTo(size, coordinate);
    }
    return path.detach();
  }, [level.gridSize, layout.cellSize, size]);

  /**
   * Hold off drawing vehicles until every sprite this level needs has decoded.
   * Drawing them as they arrive makes vehicles pop in one at a time, and
   * drawing a placeholder first makes a coloured box visibly morph into a car.
   * A board that appears complete a frame later is calmer than either.
   */
  const spritesReady = toDraw.every((v) => Boolean(images[resolveSprite(v)]));
  if (__DEV__) {
    (
      globalThis as typeof globalThis & { __BOARD_DIAGNOSTICS__?: unknown }
    ).__BOARD_DIAGNOSTICS__ = {
      ready: spritesReady,
      requested: toDraw.map((v) => resolveSprite(v)),
      available: Object.keys(images),
      vehicles: toDraw.length,
    };
  }

  /**
   * Vehicles the engine has already removed but which are still driving off
   * screen. The engine is pure and drops an escaped vehicle immediately; the
   * renderer is what owns how long it remains visible. Keeping that here
   * rather than in the engine is the layer split doing its job.
   */
  const [exiting, setExiting] = useState<Vehicle[]>([]);
  const previous = useRef<Vehicle[]>(toDraw);

  const tracker = useRef<ReturnType<typeof createExitTracker> | null>(null);
  if (!tracker.current) {
    tracker.current = createExitTracker(
      setExiting,
      Timing.exitMs + EXIT_GRACE_MS
    );
  }
  useEffect(() => {
    const current = tracker.current!;
    return () => current.dispose();
  }, []);
  useEffect(() => {
    tracker.current!.update(previous.current, toDraw);
    previous.current = toDraw;
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
    [layout, onCellTap]
  );

  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);

  const gesture = useMemo(() => {
    // Both commit to the store, which is a JS-thread operation. They run once
    // per gesture, not per frame, so neither is on the render critical path
    // (ARCHITECTURE.md).
    const tap = Gesture.Tap()
      .enabled(spritesReady && !screenReader)
      .runOnJS(true)
      .onEnd((e) => handleCell(e.x, e.y));

    // A vehicle has exactly one direction, so a swipe does not need to match
    // it — swiping anywhere on a vehicle means "go". That keeps the game
    // playable without precise gestures (PRD §7).
    const pan = Gesture.Pan()
      .enabled(spritesReady && !screenReader)
      .runOnJS(true)
      .minDistance(12)
      .onBegin((e) => {
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
  }, [handleCell, spritesReady, screenReader]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width: size, height: size }}>
        {/* Opaque vector surface covers the old painted sixths for every grid size. */}
        <Canvas style={{ width: size, height: size }} accessible={false}>
          <RoundedRect
            x={0}
            y={0}
            width={size}
            height={size}
            r={12}
            color={Colors.roadTile}
          />
          <Path
            path={grid}
            style="stroke"
            strokeWidth={1}
            color={Colors.roadLine}
            opacity={0.22}
          />
          <RoundedRect
            x={1}
            y={1}
            width={size - 2}
            height={size - 2}
            r={12}
            color={Colors.boardBackground}
            style="stroke"
            strokeWidth={2}
          />
          {spritesReady
            ? toDraw.map((v) => (
                <VehicleSprite
                  key={v.id}
                  vehicle={v}
                  layout={layout}
                  sprite={images[resolveSprite(v)]!}
                  showDirectionArrow={showDirectionArrows}
                  reducedMotion={reducedMotion}
                  blockedSignal={blockedVehicleId === v.id ? blockedAt : 0}
                  hinted={hintVehicleId === v.id}
                />
              ))
            : null}
          {exiting
            // An undo can bring a vehicle back while its exit is still
            // playing; the live copy wins.
            .filter((v) => !toDraw.some((t) => t.id === v.id))
            .filter((v) => Boolean(images[resolveSprite(v)]))
            .map((v) => (
              <VehicleSprite
                key={`exit-${v.id}`}
                vehicle={v}
                layout={layout}
                sprite={images[resolveSprite(v)]!}
                showDirectionArrow={showDirectionArrows}
                reducedMotion={reducedMotion}
                exiting
              />
            ))}
        </Canvas>
        {!spritesReady ? (
          <View pointerEvents="none" style={styles.loading}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
        {screenReader ? (
          <View
            pointerEvents="box-none"
            style={[styles.accessibilityLayer, { width: size, height: size }]}
          >
            {toDraw.map((vehicle) => (
              <Pressable
                key={vehicle.id}
                disabled={!spritesReady}
                accessibilityRole="button"
                accessibilityLabel={`${vehicle.color} ${vehicle.type}, facing ${vehicle.direction}`}
                accessibilityHint="Activate to drive forward"
                onPress={() => onCellTap?.(vehicle.x, vehicle.y)}
                style={[
                  styles.accessibilityTarget,
                  {
                    left: vehicle.x * layout.cellSize,
                    top: vehicle.y * layout.cellSize,
                    width: vehicle.width * layout.cellSize,
                    height: Math.max(44, vehicle.height * layout.cellSize),
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  accessibilityLayer: { position: "absolute" },
  accessibilityTarget: { position: "absolute" },
});

export const GameBoard = memo(GameBoardView);
