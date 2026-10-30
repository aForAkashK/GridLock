import {
  generateLevel,
  layoutKey,
  scoreLevel,
  validateSpec,
  type GenerationSpec,
} from '../../tools/level-tools/generator';
import {
  successors,
  applyMove,
  legalMoves,
} from '../../src/game/engine/movement';
import { createInitialState, isWon } from '../../src/game/models/GameState';
import type { Level } from '../../src/game/models/Level';
import { LEVELS } from '../../src/game/levels';
import { solve } from '../../src/game/engine/solver';

const chain: Level = {
  id: 99,
  gridSize: 6,
  difficulty: 'easy',
  vehicles: [
    {
      id: 'a',
      type: 'car',
      color: 'red',
      x: 0,
      y: 3,
      width: 2,
      height: 1,
      direction: 'right',
    },
    {
      id: 'b',
      type: 'car',
      color: 'blue',
      x: 3,
      y: 2,
      width: 1,
      height: 2,
      direction: 'up',
    },
    {
      id: 'c',
      type: 'car',
      color: 'green',
      x: 2,
      y: 1,
      width: 2,
      height: 1,
      direction: 'right',
    },
  ],
};
const spec: GenerationSpec = {
  id: 51,
  gridSize: 6,
  difficulty: 'hard',
  vehicles: 9,
  minPar: 10,
  maxPar: 13,
  minBlocked: 2,
  minExtraMoves: 1,
  minExitWaves: 2,
  minScore: 8,
  maxHintMs: 1000,
  seed: 5100000,
  attempts: 1000,
};

describe('shared move expansion', () => {
  it.each(LEVELS.map((level) => [level.id, level] as const))(
    'matches public moves and remains pure on level %i',
    (_id, level) => {
      let state = createInitialState(level);
      for (const id of solve(state)!.moves) {
        const snapshot = JSON.stringify(state);
        expect(successors(state)).toEqual(
          legalMoves(state).map((move) => applyMove(state, move)),
        );
        expect(JSON.stringify(state)).toBe(snapshot);
        state = applyMove(state, id).state;
      }
    },
  );
});

describe('layout deduplication', () => {
  it('ignores cosmetic differences and array order', () => {
    const recoloured = {
      ...chain,
      vehicles: chain.vehicles
        .map((v, i) => ({
          ...v,
          id: `renamed-${i}`,
          color: 'orange',
          type: 'taxi' as const,
        }))
        .reverse(),
    };
    expect(layoutKey(recoloured)).toBe(layoutKey(chain));
  });
  it('recognises a rotated board with rotated directions and footprints', () => {
    const rotated: Level = {
      ...chain,
      vehicles: [
        {
          ...chain.vehicles[0],
          x: 2,
          y: 0,
          width: 1,
          height: 2,
          direction: 'down',
        },
        {
          ...chain.vehicles[1],
          x: 2,
          y: 3,
          width: 2,
          height: 1,
          direction: 'right',
        },
        {
          ...chain.vehicles[2],
          x: 4,
          y: 2,
          width: 1,
          height: 2,
          direction: 'down',
        },
      ],
    };
    expect(layoutKey(rotated)).toBe(layoutKey(chain));
  });
  it('distinguishes changed direction, footprint, grid size and obstacles', () => {
    expect(
      layoutKey({
        ...chain,
        vehicles: chain.vehicles.map((v, i) =>
          i ? v : { ...v, direction: 'left' },
        ),
      }),
    ).not.toBe(layoutKey(chain));
    expect(layoutKey({ ...chain, gridSize: 7 })).not.toBe(layoutKey(chain));
    expect(
      layoutKey({
        ...chain,
        vehicles: chain.vehicles.map((v, i) => (i ? v : { ...v, width: 3 })),
      }),
    ).not.toBe(layoutKey(chain));
    expect(
      layoutKey({
        ...chain,
        obstacles: [{ id: 'o', type: 'cone', x: 0, y: 0, width: 1, height: 1 }],
      }),
    ).not.toBe(layoutKey(chain));
  });
});

describe('difficulty heuristics', () => {
  it('records a three-wave exit chain without claiming extra moves', () => {
    expect(scoreLevel(chain, ['c', 'b', 'a'])).toMatchObject({
      immediateExits: 1,
      extraMoves: 0,
      exitWaves: 3,
    });
  });
  it('scores blocking structure above independent taps with the same par', () => {
    const independent: Level = {
      ...chain,
      vehicles: chain.vehicles.map((v, i) => ({
        ...v,
        x: 0,
        y: i,
        width: 2,
        height: 1,
        direction: 'right',
      })),
    };
    expect(scoreLevel(chain, ['c', 'b', 'a']).score).toBeGreaterThan(
      scoreLevel(independent, ['a', 'b', 'c']).score,
    );
  });
});

describe('seeded generation', () => {
  it('exports reproducible, replayable boards and provenance', () => {
    const found = generateLevel(spec)!;
    expect(found).not.toBeNull();
    expect(generateLevel(spec)?.level).toEqual(found.level);
    const metadata = found.level.generation!;
    expect(
      generateLevel({ ...spec, seed: metadata.seed, attempts: 1 })?.level,
    ).toEqual(found.level);
    expect(metadata.metrics.score).toBeGreaterThanOrEqual(spec.minScore);
    expect(metadata.metrics.initialBlocked).toBeGreaterThanOrEqual(
      spec.minBlocked,
    );
    expect(metadata.metrics.extraMoves).toBeGreaterThanOrEqual(
      spec.minExtraMoves,
    );
    expect(metadata.metrics.exitWaves).toBeGreaterThanOrEqual(
      spec.minExitWaves,
    );
    let state = createInitialState(found.level);
    for (const id of solve(state)!.moves) {
      state = applyMove(state, id).state;
    }
    expect(isWon(state)).toBe(true);
  });
  it('rejects an excluded layout, including its cosmetic variants', () => {
    const found = generateLevel(spec)!;
    expect(
      generateLevel(
        { ...spec, seed: found.level.generation!.seed, attempts: 1 },
        new Set([layoutKey(found.level)]),
      ),
    ).toBeNull();
  });
  it('returns null when no board meets the requested quality within budget', () => {
    expect(generateLevel({ ...spec, attempts: 2, minScore: 10000 })).toBeNull();
  });
  it.each([
    { vehicles: 19 },
    { minPar: 1 },
    { maxPar: 2 },
    { gridSize: 2 },
    { gridSize: 13 },
    { attempts: 0 },
    { seed: 0xffffffff },
    { minBlocked: 10 },
    { minExitWaves: 10 },
    { maxHintMs: NaN },
    { minScore: -1 },
    { seed: 0.5 },
  ])('rejects invalid settings %j', (overrides) => {
    expect(() => validateSpec({ ...spec, ...overrides })).toThrow(
      'Invalid generator settings',
    );
  });
});
