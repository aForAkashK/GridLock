/**
 * Vehicle sprite registry.
 *
 * `require` paths must be static literals — Metro resolves them at bundle
 * time — so this is an explicit map rather than a path built from the type.
 *
 * Every sprite is authored facing DOWN — the vehicle's nose points toward the
 * bottom of the image. The renderer rotates it into the vehicle's direction,
 * exactly as it does for the arrows: one asset per vehicle instead of four
 * that can drift apart.
 *
 * If new art arrives facing up instead, flip `SPRITE_FACES` rather than
 * editing four cases.
 */

/** Rotation, in radians, that the source art already represents. */
const SPRITE_FACES: Direction = 'down';

import { useImage, type SkImage } from '@shopify/react-native-skia';
import type { Direction, VehicleType } from '../models/Vehicle';

export const VEHICLE_SPRITES: Record<VehicleType, ReturnType<typeof require>> = {
  car: require('../../../assets/game/vehicles/car/car.webp'),
  taxi: require('../../../assets/game/vehicles/taxi/taxi.webp'),
  bus: require('../../../assets/game/vehicles/bus/bus.webp'),
  truck: require('../../../assets/game/vehicles/truck/truck.webp'),
  police: require('../../../assets/game/vehicles/police/police.webp'),
  ambulance: require('../../../assets/game/vehicles/ambulance/ambulance.webp'),
};

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

export type VehicleImages = Record<VehicleType, SkImage | null>;

/**
 * Decodes every vehicle sprite once.
 *
 * Hooks cannot be called in a loop, so each type is listed explicitly. Doing
 * this at board level rather than inside each sprite means the images decode
 * once per board rather than once per vehicle, and lets the board hold off
 * drawing until they are all ready — otherwise vehicles pop in individually,
 * or worse, a placeholder box is drawn and then replaced.
 */
export function useVehicleImages(): VehicleImages {
  return {
    car: useImage(VEHICLE_SPRITES.car),
    taxi: useImage(VEHICLE_SPRITES.taxi),
    bus: useImage(VEHICLE_SPRITES.bus),
    truck: useImage(VEHICLE_SPRITES.truck),
    police: useImage(VEHICLE_SPRITES.police),
    ambulance: useImage(VEHICLE_SPRITES.ambulance),
  };
}
