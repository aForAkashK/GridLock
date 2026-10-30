/** Versioned content contract. Pure and shared by the app and release tooling. */
import type { Level } from '../../game/models/Level';
import type { Vehicle } from '../../game/models/Vehicle';
import { validateLevelGeometry } from '../../game/engine/levelValidator';

export const MAX_CATALOG_LENGTH = 512 * 1024;
export const MAX_REMOTE_LEVELS = 200;
export const CATALOG_FORMAT = 1;
export const RULES_VERSION = 1;

export type LevelCatalog = {
  formatVersion: 1;
  rulesVersion: 1 | 2;
  revision: number;
  baseLevelId: number;
  levels: Level[];
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a content object');
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown, min: number, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error('Invalid content integer');
  }
  return value;
}

function choice<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error('Unsupported content value');
  }
  return value as T;
}

/** Compatibility checks are cheap; solving belongs in the publishing gate. */
export function parseDeliveredLevel(
  value: unknown,
  rulesVersion: 1 | 2 = 1,
): Level {
  const input = object(value);
  if (
    !(rulesVersion === 1 ? [6] : [6, 7, 8]).includes(Number(input.gridSize)) ||
    (input.obstacles !== undefined &&
      (!Array.isArray(input.obstacles) || input.obstacles.length > 0))
  ) {
    throw new Error(
      'Unsupported board size or obstacles for this content channel',
    );
  }
  const gridSize = integer(input.gridSize, 6, rulesVersion === 1 ? 6 : 8);
  if (
    !Array.isArray(input.vehicles) ||
    input.vehicles.length < 2 ||
    input.vehicles.length > Math.floor((gridSize * gridSize) / 2)
  ) {
    throw new Error('Unsupported vehicle count');
  }
  const vehicles: Vehicle[] = input.vehicles.map((raw) => {
    const v = object(raw);
    if (typeof v.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(v.id)) {
      throw new Error('Invalid vehicle ID');
    }
    const type = choice(v.type, [
      'car',
      'truck',
      'bus',
      'taxi',
      'police',
      'ambulance',
    ] as const);
    const width = integer(v.width, 1, 3);
    const height = integer(v.height, 1, 3);
    const direction = choice(v.direction, [
      'up',
      'down',
      'left',
      'right',
    ] as const);
    const length = type === 'bus' || type === 'truck' ? 3 : 2;
    const horizontal = direction === 'left' || direction === 'right';
    if (
      width !== (horizontal ? length : 1) ||
      height !== (horizontal ? 1 : length)
    ) {
      throw new Error(
        'Vehicle footprint or direction is incompatible with bundled art',
      );
    }
    return {
      id: v.id,
      type,
      x: integer(v.x, 0, gridSize - 1),
      y: integer(v.y, 0, gridSize - 1),
      width,
      height,
      direction,
      color: choice(v.color, [
        'red',
        'blue',
        'yellow',
        'green',
        'purple',
        'orange',
      ] as const),
    };
  });
  const level: Level = {
    id: integer(input.id, 1, Number.MAX_SAFE_INTEGER),
    gridSize,
    difficulty: choice(input.difficulty, [
      'easy',
      'medium',
      'hard',
      'expert',
    ] as const),
    vehicles,
    parMoves: integer(input.parMoves, vehicles.length, 200),
  };
  const issues = validateLevelGeometry(level);
  if (issues.length > 0) {
    throw new Error(`Invalid board: ${issues[0].code}`);
  }
  return level;
}

export function parseCatalog(
  text: string,
  baseLevelId: number,
  rulesVersion: 1 | 2 = 1,
): LevelCatalog {
  if (text.length > MAX_CATALOG_LENGTH) {
    throw new Error('Level catalog is too large');
  }
  const input = object(JSON.parse(text));
  if (
    input.formatVersion !== CATALOG_FORMAT ||
    input.rulesVersion !== rulesVersion ||
    input.baseLevelId !== baseLevelId
  ) {
    throw new Error('Incompatible level catalog');
  }
  if (!Array.isArray(input.levels) || input.levels.length > MAX_REMOTE_LEVELS) {
    throw new Error('Unsupported catalog length');
  }
  const levels = input.levels.map((level) =>
    parseDeliveredLevel(level, rulesVersion),
  );
  if (levels.some((level, i) => level.id !== baseLevelId + i + 1)) {
    throw new Error(
      'Downloaded levels must be a contiguous extension of the bundled campaign',
    );
  }
  return {
    formatVersion: 1,
    rulesVersion,
    revision: integer(input.revision, 1, Number.MAX_SAFE_INTEGER),
    baseLevelId,
    levels,
  };
}

/** Reject replacement/removal of an already delivered puzzle. */
export function assertAppendOnly(
  previous: LevelCatalog | null,
  next: LevelCatalog,
): void {
  if (!previous) {
    return;
  }
  if (
    next.levels.length < previous.levels.length ||
    previous.levels.some(
      (level, i) => JSON.stringify(level) !== JSON.stringify(next.levels[i]),
    )
  ) {
    throw new Error('Published levels are immutable; catalogs may only append');
  }
}
