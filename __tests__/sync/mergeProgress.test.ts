import {
  mergeProgress,
  sanitizeLevels,
} from '../../src/services/sync/mergeProgress';

describe('mergeProgress', () => {
  it('restores progress onto a wiped device', () => {
    const r = mergeProgress(
      { completedLevels: [], currentLevel: 1 },
      { completedLevels: [1, 2], currentLevel: 3 },
    );
    expect(r.merged).toEqual({ completedLevels: [1, 2], currentLevel: 3 });
    expect(r.localChanged).toBe(true);
    expect(r.cloudBehind).toBe(false);
  });

  it('pushes local progress the cloud has never seen', () => {
    const r = mergeProgress({ completedLevels: [1], currentLevel: 2 }, null);
    expect(r.merged).toEqual({ completedLevels: [1], currentLevel: 2 });
    expect(r.localChanged).toBe(false);
    expect(r.cloudBehind).toBe(true);
  });

  it('takes the union when each side cleared different levels', () => {
    const r = mergeProgress(
      { completedLevels: [1, 2, 5], currentLevel: 6 },
      { completedLevels: [1, 3], currentLevel: 4 },
    );
    expect(r.merged).toEqual({ completedLevels: [1, 2, 3, 5], currentLevel: 6 });
    expect(r.localChanged).toBe(true);
    expect(r.cloudBehind).toBe(true);
  });

  it('never shrinks either copy', () => {
    const r = mergeProgress(
      { completedLevels: [1, 2, 3], currentLevel: 4 },
      { completedLevels: [1], currentLevel: 2 },
    );
    expect(r.merged.completedLevels).toEqual([1, 2, 3]);
    expect(r.merged.currentLevel).toBe(4);
  });

  it('reports nothing to do when both sides agree', () => {
    const r = mergeProgress(
      { completedLevels: [2, 1], currentLevel: 3 },
      { completedLevels: [1, 2], currentLevel: 3 },
    );
    expect(r.localChanged).toBe(false);
    expect(r.cloudBehind).toBe(false);
  });

  it('treats a cloud doc without progress fields as having none', () => {
    const r = mergeProgress({ completedLevels: [1], currentLevel: 2 }, {});
    expect(r.cloudBehind).toBe(true);
  });
});

describe('sanitizeLevels', () => {
  it('drops junk a bad write could have left in the cloud', () => {
    expect(sanitizeLevels([3, 1, 'x', null, -2, 0, 1.5, 3, 2])).toEqual([1, 2, 3]);
  });

  it('treats a non-array as empty', () => {
    expect(sanitizeLevels(undefined)).toEqual([]);
    expect(sanitizeLevels({ 0: 1 })).toEqual([]);
  });
});
