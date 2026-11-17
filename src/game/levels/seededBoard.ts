import type { Direction, Vehicle, VehicleType } from "../models/Vehicle";
import type { Level } from "../models/Level";

const COLORS = ["red", "blue", "yellow", "green", "purple", "orange"];

/**
 * Vehicle types by footprint. Every sprite is used, not just car and truck —
 * silhouette is one of the three cues a player reads a board by (DESIGN.md),
 * and while every car shares one sprite, varying the TYPE is what makes a
 * crowded board legible.
 */
const TYPES_3 = ["truck", "bus"] as const;

/**
 * 2-cell vehicles are weighted toward `car`. Taxi, police and ambulance each
 * have ONE fixed look, so a board full of them is as hard to tell apart as a
 * board of identical cars. Cars carry the palette colour, which is what makes
 * "move the blue one" possible — the specials stay as occasional accents.
 */
const TYPES_2: Array<[VehicleType, number]> = [
  ["car", 0.6],
  ["taxi", 0.14],
  ["police", 0.13],
  ["ambulance", 0.13],
];

/** One random draw either way, so the generator's RNG sequence is unchanged. */
function pickWeighted(
  r: number,
  table: Array<[VehicleType, number]>
): VehicleType {
  let acc = 0;
  for (const [type, weight] of table) {
    acc += weight;
    if (r < acc) {
      return type;
    }
  }
  return table[table.length - 1][0];
}

/** Types that take the level's palette colour; the rest have a fixed look. */
const COLOURED = new Set<VehicleType>(["car", "truck", "bus"]);

/**
 * The V1 endless seed table depends on this PRNG and the placement recipe below.
 * Deterministic PRNG (mulberry32) so a seed always yields the same board.
 * Bit twiddling is the algorithm, not a style slip.
 */
/* eslint-disable no-bitwise */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* eslint-enable no-bitwise */

export function randomBoard(
  random: () => number,
  spec: { vehicles: number; gridSize: number }
): Vehicle[] {
  const placed: Vehicle[] = [];
  let coloured = 0;
  const occupied = new Set<string>();

  for (let n = 0; n < spec.vehicles; n++) {
    // 40 attempts per vehicle, then give up on this candidate entirely —
    // a board too dense to place into is not one we want anyway.
    for (let attempt = 0; attempt < 40; attempt++) {
      const horizontal = random() < 0.5;
      // Mostly 2-cell cars, occasionally a 3-cell truck.
      const length = random() < 0.25 ? 3 : 2;
      const width = horizontal ? length : 1;
      const height = horizontal ? 1 : length;

      const x = Math.floor(random() * (spec.gridSize - width + 1));
      const y = Math.floor(random() * (spec.gridSize - height + 1));

      const cells: string[] = [];
      let clash = false;
      for (let dy = 0; dy < height && !clash; dy++) {
        for (let dx = 0; dx < width && !clash; dx++) {
          const key = `${x + dx},${y + dy}`;
          if (occupied.has(key)) {
            clash = true;
          }
          cells.push(key);
        }
      }
      if (clash) {
        continue;
      }

      // A vehicle only ever travels along its own long axis — a 2x1 car that
      // moves "up" would be pushing sideways, which the art cannot express.
      const axis: Direction[] = horizontal
        ? (["left", "right"] as Direction[])
        : (["up", "down"] as Direction[]);
      const direction = axis[Math.floor(random() * axis.length)];

      // Exactly ONE random() either way — keeping the RNG sequence identical is
      // what lets the reweight change vehicle identities without changing any
      // layout, par or solution.
      const r = random();
      const type: VehicleType =
        length === 3
          ? TYPES_3[Math.floor(r * TYPES_3.length)]
          : pickWeighted(r, TYPES_2);

      cells.forEach((c) => occupied.add(c));
      placed.push({
        id: `${type}-${n + 1}`,
        type,
        x,
        y,
        width,
        height,
        direction,
        // Cycle colours across coloured vehicles only, so neighbouring cars
        // differ. Fixed-look types ignore colour; 'red' is a placeholder.
        color: COLOURED.has(type) ? COLORS[coloured++ % COLORS.length] : "red",
      });
      break;
    }
  }

  return placed;
}

/**
 * Canonical geometry over four rotations. IDs, colours and cosmetic types
 * are deliberately ignored. Include obstacle geometry for future authoring.
 */
export function layoutKey(level: Level): string {
  const directions: Direction[] = ["up", "right", "down", "left"];
  let vehicles = level.vehicles;
  let obstacles = level.obstacles ?? [];
  const keys: string[] = [];
  for (let turn = 0; turn < 4; turn++) {
    const geometry = vehicles
      .map((v) => `${v.x},${v.y},${v.width},${v.height},${v.direction}`)
      .sort();
    const blocks = obstacles
      .map((v) => `${v.x},${v.y},${v.width},${v.height}`)
      .sort();
    keys.push(`${level.gridSize}:${geometry.join(";")}#${blocks.join(";")}`);
    vehicles = vehicles.map((v) => ({
      ...v,
      x: level.gridSize - v.y - v.height,
      y: v.x,
      width: v.height,
      height: v.width,
      direction: directions[(directions.indexOf(v.direction) + 1) % 4],
    }));
    obstacles = obstacles.map((v) => ({
      ...v,
      x: level.gridSize - v.y - v.height,
      y: v.x,
      width: v.height,
      height: v.width,
    }));
  }
  return keys.sort()[0];
}
