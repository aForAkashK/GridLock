import feed from '../../level-content/public/levels/catalog-v1.json';
import {
  assertAppendOnly,
  MAX_CATALOG_LENGTH,
  parseCatalog,
} from '../../src/services/levels/catalog';

const copy = () => JSON.parse(JSON.stringify(feed)) as typeof feed;

describe('delivered catalog contract', () => {
  it('accepts the release and strips unknown metadata', () => {
    const input = { ...copy(), extra: 'unused' };
    expect(
      parseCatalog(JSON.stringify(input), 50).levels.map((l) => l.id),
    ).toEqual([51, 52, 53, 54, 55]);
    expect(parseCatalog(JSON.stringify(input), 50)).not.toHaveProperty('extra');
  });
  it.each([
    { formatVersion: 2 },
    { rulesVersion: 2 },
    { baseLevelId: 49 },
    { revision: 0 },
    { revision: 1.5 },
    { levels: null },
    { levels: Array(201).fill(feed.levels[0]) },
  ])('rejects incompatible envelopes %j', (changes) => {
    expect(() =>
      parseCatalog(JSON.stringify({ ...copy(), ...changes }), 50),
    ).toThrow();
  });
  it.each(['null', '[]', '{', 'true', '{}'])(
    'rejects malformed input %s',
    (text) => {
      expect(() => parseCatalog(text, 50)).toThrow();
    },
  );
  it('rejects oversized content before parsing', () => {
    expect(() => parseCatalog(' '.repeat(MAX_CATALOG_LENGTH + 1), 50)).toThrow(
      'too large',
    );
  });
  it.each([
    { id: 52 },
    { gridSize: 7 },
    { difficulty: 'extreme' },
    { parMoves: 1 },
    { obstacles: [{ x: 0, y: 0 }] },
    { vehicles: [] },
  ])('rejects unsupported level data %j', (changes) => {
    const input = copy();
    Object.assign(input.levels[0], changes);
    expect(() => parseCatalog(JSON.stringify(input), 50)).toThrow();
  });
  it.each([
    { x: 1.5 },
    { y: 99 },
    { width: 4 },
    { width: 0 },
    { direction: 'diagonal' },
    { type: 'motorbike' },
    { color: '#ff0000' },
    { id: '@' },
    { direction: 'up', width: 2, height: 1 },
  ])('rejects incompatible vehicles %j', (changes) => {
    const input = copy();
    Object.assign(input.levels[0].vehicles[0], changes);
    expect(() => parseCatalog(JSON.stringify(input), 50)).toThrow();
  });
  it('uses the engine geometry gate for overlaps and duplicate IDs', () => {
    const input = copy();
    input.levels[0].vehicles[1] = { ...input.levels[0].vehicles[0] };
    expect(() => parseCatalog(JSON.stringify(input), 50)).toThrow(
      'Invalid board',
    );
  });
  it('rejects missing, duplicate and reordered campaign IDs', () => {
    for (const levels of [
      feed.levels.slice(1),
      [feed.levels[0], feed.levels[0]],
      [...feed.levels].reverse(),
    ]) {
      expect(() =>
        parseCatalog(JSON.stringify({ ...feed, levels }), 50),
      ).toThrow('contiguous');
    }
  });
  it('permits only immutable extensions of previously installed content', () => {
    const previous = parseCatalog(
      JSON.stringify({ ...feed, levels: feed.levels.slice(0, 2) }),
      50,
    );
    const next = parseCatalog(JSON.stringify({ ...feed, revision: 2 }), 50);
    expect(() => assertAppendOnly(previous, next)).not.toThrow();
    expect(() => assertAppendOnly(next, previous)).toThrow('immutable');
    next.levels[0].vehicles[0].color = 'orange';
    expect(() => assertAppendOnly(previous, next)).toThrow('immutable');
  });
});
