import { skinAssets } from "../../services/shop/assets";
import { reportIssue } from "../../services/diagnostics/client";
import {
  replacementSprite,
  type SkinSlots,
  type AppearanceSlot,
} from "../../services/shop/policy";
/**
 * Vehicle sprite registry.
 *
 * `require` paths must be static literals — Metro resolves them at bundle
 * time — so every sprite is listed explicitly rather than built from a path.
 *
 * Car, truck and bus come in the six palette colours, one file each: tinting a
 * single sprite in code muddies the colours and flattens the highlights.
 * Taxi, police and ambulance have ONE fixed look and ignore the level's
 * colour — they are recognised by that look, so a purple police car would be
 * wrong rather than varied.
 *
 * Every sprite is authored facing DOWN — the nose points toward the bottom of
 * the image. The renderer rotates it into the vehicle's direction, exactly as
 * it does for the arrows.
 *
 * If new art arrives facing up instead, flip `SPRITE_FACES` rather than
 * editing four cases.
 */

import { Skia, type SkImage } from "@shopify/react-native-skia";
import { useEffect, useMemo, useState } from "react";
import { Image } from "react-native";
import type { Direction, Vehicle } from "../models/Vehicle";

/** Direction the source art already faces. */
const SPRITE_FACES: Direction = "down";

const COLOURED_TYPES = ["car", "truck", "bus"] as const;
const PALETTE = ["red", "blue", "yellow", "green", "purple", "orange"];

export type SpriteKey =
  | keyof typeof skinAssets
  | "car_red"
  | "car_blue"
  | "car_yellow"
  | "car_green"
  | "car_purple"
  | "car_orange"
  | "truck_red"
  | "truck_blue"
  | "truck_yellow"
  | "truck_green"
  | "truck_purple"
  | "truck_orange"
  | "bus_red"
  | "bus_blue"
  | "bus_yellow"
  | "bus_green"
  | "bus_purple"
  | "bus_orange"
  | "taxi"
  | "police"
  | "ambulance";

const SPRITES: Record<SpriteKey, number> = {
  ...skinAssets,
  car_red: require("../../../assets/game/vehicles/car/car_red.webp"),
  car_blue: require("../../../assets/game/vehicles/car/car_blue.webp"),
  car_yellow: require("../../../assets/game/vehicles/car/car_yellow.webp"),
  car_green: require("../../../assets/game/vehicles/car/car_green.webp"),
  car_purple: require("../../../assets/game/vehicles/car/car_purple.webp"),
  car_orange: require("../../../assets/game/vehicles/car/car_orange.webp"),
  truck_red: require("../../../assets/game/vehicles/truck/truck_red.webp"),
  truck_blue: require("../../../assets/game/vehicles/truck/truck_blue.webp"),
  truck_yellow: require("../../../assets/game/vehicles/truck/truck_yellow.webp"),
  truck_green: require("../../../assets/game/vehicles/truck/truck_green.webp"),
  truck_purple: require("../../../assets/game/vehicles/truck/truck_purple.webp"),
  truck_orange: require("../../../assets/game/vehicles/truck/truck_orange.webp"),
  bus_red: require("../../../assets/game/vehicles/bus/bus_red.webp"),
  bus_blue: require("../../../assets/game/vehicles/bus/bus_blue.webp"),
  bus_yellow: require("../../../assets/game/vehicles/bus/bus_yellow.webp"),
  bus_green: require("../../../assets/game/vehicles/bus/bus_green.webp"),
  bus_purple: require("../../../assets/game/vehicles/bus/bus_purple.webp"),
  bus_orange: require("../../../assets/game/vehicles/bus/bus_orange.webp"),
  taxi: require("../../../assets/game/vehicles/taxi/taxi.webp"),
  police: require("../../../assets/game/vehicles/police/police.webp"),
  ambulance: require("../../../assets/game/vehicles/ambulance/ambulance.webp"),
};

/** Which sprite a vehicle draws with. Unknown colours fall back to red. */
export function spriteKey(v: Vehicle, skin = "default"): SpriteKey {
  const override = replacementSprite(v.type, v.color, skin);
  if (override) return override;
  if ((COLOURED_TYPES as readonly string[]).includes(v.type)) {
    const colour = PALETTE.includes(v.color) ? v.color : "red";
    return `${v.type}_${colour}` as SpriteKey;
  }
  return v.type as SpriteKey;
}

/** Shared category routing for readiness checks, decoding and drawing. */
export function equippedSpriteKey(
  v: Vehicle,
  slots: SkinSlots = {}
): SpriteKey {
  return spriteKey(
    v,
    slots[`${v.type}:${v.color}` as AppearanceSlot] ?? "default"
  );
}

/** Clockwise radians from "facing up" for each direction. */
const HEADING: Record<Direction, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

/**
 * Radians to rotate the source art so the vehicle faces `direction`.
 *
 * Expressed as a delta from whichever way the art already faces, so the
 * source's orientation is stated once instead of baked into four cases.
 */
export function spriteRotation(direction: Direction): number {
  return HEADING[direction] - HEADING[SPRITE_FACES];
}

export type VehicleImages = Partial<Record<SpriteKey, SkImage>>;
const failures: string[] = [];
export function spriteDiagnostics() {
  return {
    decoded: [...decoded.keys()],
    loading: [...loading.keys()],
    failures,
  };
}
const decoded = new Map<SpriteKey, SkImage>();
// Skins expand the registry without expanding the retained decoded cache.
const CACHE_BYTES = 12.25 * 1024 ** 2;
let decodedBytes = 0;
const imageBytes = (image: SkImage) => image.width() * image.height() * 4;
function rememberSprite(key: SpriteKey, image: SkImage): void {
  decoded.set(key, image);
  decodedBytes += imageBytes(image);
  while (decodedBytes > CACHE_BYTES) {
    const oldest = decoded.entries().next().value;
    if (!oldest) break;
    decoded.delete(oldest[0]);
    decodedBytes -= imageBytes(oldest[1]);
  }
}
const loading = new Map<SpriteKey, Promise<SkImage>>();

function loadSprite(key: SpriteKey): Promise<SkImage> {
  const cached = decoded.get(key);
  if (cached) {
    decoded.delete(key);
    decoded.set(key, cached);
    return Promise.resolve(cached);
  }
  const existing = loading.get(key);
  if (existing) {
    return existing;
  }
  const source = Image.resolveAssetSource(SPRITES[key]);
  if (!source) {
    return Promise.reject(new Error(`Missing sprite ${key}`));
  }
  const task = Skia.Data.fromURI(source.uri)
    .then((data) => {
      const result = Skia.Image.MakeImageFromEncoded(data);
      if (!result) {
        throw new Error(`Cannot decode ${key}`);
      }
      rememberSprite(key, result);
      return result;
    })
    .finally(() => {
      loading.delete(key);
    });
  loading.set(key, task);
  return task;
}

/** Prepare only the upcoming board, sharing the exact same cache and in-flight tasks. */
export async function warmVehicleImages(
  vehicles: Vehicle[],
  slots: SkinSlots,
  shouldContinue = () => true
): Promise<void> {
  const keys = [...new Set(vehicles.map((v) => equippedSpriteKey(v, slots)))];
  // Yield between decodes rather than starting the whole library at startup.
  for (const key of keys) {
    if (!shouldContinue()) break;
    try {
      await loadSprite(key);
    } catch {
      /* The board retains its normal retry path. */
    }
  }
}

/** Only decode what the board needs; retain decoded sprites across level changes. */
export function useVehicleImages(
  vehicles: Vehicle[],
  slots: SkinSlots
): VehicleImages {
  const keys = useMemo(
    () => [...new Set(vehicles.map((v) => equippedSpriteKey(v, slots)))],
    [vehicles, slots]
  );
  const [images, setImages] = useState<VehicleImages>(() =>
    Object.fromEntries(
      keys
        .filter((key) => decoded.has(key))
        .map((key) => [key, decoded.get(key)!])
    )
  );
  useEffect(() => {
    let active = true;
    Promise.all(keys.map(async (key) => [key, await loadSprite(key)] as const))
      .then((entries) => {
        if (active) {
          setImages(Object.fromEntries(entries));
        }
      })
      .catch((error) => {
        reportIssue("assets.decode", error);
        failures.push(String(error));
        if (__DEV__) {
          console.warn("[sprites]", String(error));
        }
      });
    return () => {
      active = false;
    };
  }, [keys]);
  return images;
}
