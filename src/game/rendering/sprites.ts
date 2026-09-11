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

import { useImage, type SkImage } from '@shopify/react-native-skia';
import type { Direction, Vehicle } from '../models/Vehicle';

/** Direction the source art already faces. */
const SPRITE_FACES: Direction = 'down';

const COLOURED_TYPES = ['car', 'truck', 'bus'] as const;
const PALETTE = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

export type SpriteKey = 'car_red' | 'car_blue' | 'car_yellow' | 'car_green' | 'car_purple' | 'car_orange' | 'truck_red' | 'truck_blue' | 'truck_yellow' | 'truck_green' | 'truck_purple' | 'truck_orange' | 'bus_red' | 'bus_blue' | 'bus_yellow' | 'bus_green' | 'bus_purple' | 'bus_orange' | 'taxi' | 'police' | 'ambulance';

const SPRITES: Record<SpriteKey, number> = {
  car_red: require('../../../assets/game/vehicles/car/car_red.webp'),
  car_blue: require('../../../assets/game/vehicles/car/car_blue.webp'),
  car_yellow: require('../../../assets/game/vehicles/car/car_yellow.webp'),
  car_green: require('../../../assets/game/vehicles/car/car_green.webp'),
  car_purple: require('../../../assets/game/vehicles/car/car_purple.webp'),
  car_orange: require('../../../assets/game/vehicles/car/car_orange.webp'),
  truck_red: require('../../../assets/game/vehicles/truck/truck_red.webp'),
  truck_blue: require('../../../assets/game/vehicles/truck/truck_blue.webp'),
  truck_yellow: require('../../../assets/game/vehicles/truck/truck_yellow.webp'),
  truck_green: require('../../../assets/game/vehicles/truck/truck_green.webp'),
  truck_purple: require('../../../assets/game/vehicles/truck/truck_purple.webp'),
  truck_orange: require('../../../assets/game/vehicles/truck/truck_orange.webp'),
  bus_red: require('../../../assets/game/vehicles/bus/bus_red.webp'),
  bus_blue: require('../../../assets/game/vehicles/bus/bus_blue.webp'),
  bus_yellow: require('../../../assets/game/vehicles/bus/bus_yellow.webp'),
  bus_green: require('../../../assets/game/vehicles/bus/bus_green.webp'),
  bus_purple: require('../../../assets/game/vehicles/bus/bus_purple.webp'),
  bus_orange: require('../../../assets/game/vehicles/bus/bus_orange.webp'),
  taxi: require('../../../assets/game/vehicles/taxi/taxi.webp'),
  police: require('../../../assets/game/vehicles/police/police.webp'),
  ambulance: require('../../../assets/game/vehicles/ambulance/ambulance.webp'),
};

/** Which sprite a vehicle draws with. Unknown colours fall back to red. */
export function spriteKey(v: Vehicle): SpriteKey {
  if ((COLOURED_TYPES as readonly string[]).includes(v.type)) {
    const colour = PALETTE.includes(v.color) ? v.color : 'red';
    return `${v.type}_${colour}` as SpriteKey;
  }
  return v.type as SpriteKey;
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

export type VehicleImages = Record<SpriteKey, SkImage | null>;

/**
 * Decodes every vehicle sprite once per board.
 *
 * Hooks cannot be called in a loop, so each sprite is listed explicitly. The
 * board holds off drawing until all the sprites it needs are ready —
 * otherwise vehicles pop in one at a time.
 */
export function useVehicleImages(): VehicleImages {
  return {
    car_red: useImage(SPRITES.car_red),
    car_blue: useImage(SPRITES.car_blue),
    car_yellow: useImage(SPRITES.car_yellow),
    car_green: useImage(SPRITES.car_green),
    car_purple: useImage(SPRITES.car_purple),
    car_orange: useImage(SPRITES.car_orange),
    truck_red: useImage(SPRITES.truck_red),
    truck_blue: useImage(SPRITES.truck_blue),
    truck_yellow: useImage(SPRITES.truck_yellow),
    truck_green: useImage(SPRITES.truck_green),
    truck_purple: useImage(SPRITES.truck_purple),
    truck_orange: useImage(SPRITES.truck_orange),
    bus_red: useImage(SPRITES.bus_red),
    bus_blue: useImage(SPRITES.bus_blue),
    bus_yellow: useImage(SPRITES.bus_yellow),
    bus_green: useImage(SPRITES.bus_green),
    bus_purple: useImage(SPRITES.bus_purple),
    bus_orange: useImage(SPRITES.bus_orange),
    taxi: useImage(SPRITES.taxi),
    police: useImage(SPRITES.police),
    ambulance: useImage(SPRITES.ambulance),
  };
}
