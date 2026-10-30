import feed from '../../level-content/public/levels/catalog-v1.json';
import { parseCatalog } from '../../src/services/levels/catalog';
import {
  createLevelDelivery,
  REFRESH_INTERVAL_MS,
  RETRY_INTERVAL_MS,
} from '../../src/services/levels/levelDelivery';

function setup(initialLength = 0) {
  let now = 0;
  let safe = true;
  const fetchText = jest.fn().mockResolvedValue(JSON.stringify(feed));
  const persist = jest.fn();
  const publish = jest.fn();
  const schedule = jest.fn();
  const onError = jest.fn();
  const initial = initialLength
    ? parseCatalog(
        JSON.stringify({
          ...feed,
          levels: feed.levels.slice(0, initialLength),
        }),
        50,
      )
    : null;
  const controller = createLevelDelivery({
    baseLevelId: 50,
    initial,
    fetchText,
    persist,
    publish,
    schedule,
    onError,
    canApply: () => safe,
    now: () => now,
  });
  return {
    ...controller,
    initial,
    fetchText,
    persist,
    publish,
    schedule,
    onError,
    advance: (ms: number) => {
      now += ms;
    },
    playing: (value: boolean) => {
      safe = !value;
    },
  };
}

describe('background delivery', () => {
  it('stages downloads and writes the cache before notifying the UI', async () => {
    const d = setup();
    await expect(d.refresh()).resolves.toBe('staged');
    expect(d.schedule).toHaveBeenCalledTimes(1);
    expect(d.persist).not.toHaveBeenCalled();
    expect(d.applyPending()).toBe('installed');
    expect(d.persist.mock.invocationCallOrder[0]).toBeLessThan(
      d.publish.mock.invocationCallOrder[0],
    );
    expect(d.applyPending()).toBe('unchanged');
  });
  it('defers processing while playing, then installs when safe', async () => {
    const d = setup();
    d.playing(true);
    await d.refresh();
    expect(d.applyPending()).toBe('deferred');
    expect(d.persist).not.toHaveBeenCalled();
    d.playing(false);
    expect(d.applyPending()).toBe('installed');
  });
  it('coalesces concurrent requests and throttles successful checks for an hour', async () => {
    const d = setup();
    const first = d.refresh();
    expect(d.refresh()).toBe(first);
    await first;
    await expect(d.refresh()).resolves.toBe('throttled');
    expect(d.fetchText).toHaveBeenCalledTimes(1);
    d.advance(REFRESH_INTERVAL_MS);
    await d.refresh();
    expect(d.fetchText).toHaveBeenCalledTimes(2);
  });
  it('retains the catalog offline and retries after five minutes', async () => {
    const d = setup(2);
    d.fetchText.mockRejectedValueOnce(new Error('offline'));
    await expect(d.refresh()).resolves.toBe('failed');
    expect(d.persist).not.toHaveBeenCalled();
    d.advance(RETRY_INTERVAL_MS);
    d.fetchText.mockResolvedValueOnce(JSON.stringify({ ...feed, revision: 2 }));
    await d.refresh();
    expect(d.applyPending()).toBe('installed');
    expect(d.publish.mock.calls[0][0].levels).toHaveLength(5);
  });
  it('also recovers from a transport that throws synchronously', async () => {
    const d = setup();
    d.fetchText.mockImplementationOnce(() => {
      throw new Error('failed before returning promise');
    });
    await expect(d.refresh()).resolves.toBe('failed');
    d.advance(RETRY_INTERVAL_MS);
    await expect(d.refresh()).resolves.toBe('staged');
  });
  it.each(['bad JSON', JSON.stringify({ ...feed, rulesVersion: 99 })])(
    'keeps the last good catalog on invalid data',
    async (text) => {
      const d = setup(2);
      d.fetchText.mockResolvedValueOnce(text);
      await d.refresh();
      expect(d.applyPending()).toBe('failed');
      expect(d.publish).not.toHaveBeenCalled();
      expect(d.persist).not.toHaveBeenCalled();
    },
  );
  it('does not advertise levels if their cache write fails', async () => {
    const d = setup();
    d.persist.mockImplementationOnce(() => {
      throw new Error('disk write failed');
    });
    await d.refresh();
    expect(d.applyPending()).toBe('failed');
    expect(d.publish).not.toHaveBeenCalled();
    d.advance(RETRY_INTERVAL_MS);
    await d.refresh();
    expect(d.applyPending()).toBe('installed');
  });
  it('ignores an old CDN revision without removing cached content', async () => {
    const initial = parseCatalog(JSON.stringify({ ...feed, revision: 2 }), 50);
    const persist = jest.fn();
    const d = createLevelDelivery({
      baseLevelId: 50,
      initial,
      fetchText: async () => JSON.stringify(feed),
      persist,
      publish: jest.fn(),
      schedule: jest.fn(),
      canApply: () => true,
    });
    await d.refresh();
    expect(d.applyPending()).toBe('unchanged');
    expect(persist).not.toHaveBeenCalled();
  });
  it('rejects replacement, removal and changed data under the same revision', async () => {
    for (const changed of [
      { ...feed, revision: 2, levels: feed.levels.slice(0, 1) },
      {
        ...feed,
        revision: 2,
        levels: feed.levels.map((level, i) =>
          i ? level : { ...level, difficulty: 'easy' },
        ),
      },
      { ...feed, levels: [...feed.levels, { ...feed.levels[4], id: 56 }] },
    ]) {
      const d = setup(5);
      d.fetchText.mockResolvedValueOnce(JSON.stringify(changed));
      await d.refresh();
      expect(d.applyPending()).toBe('failed');
      expect(d.persist).not.toHaveBeenCalled();
    }
  });
  it('does not write again for an unchanged revision', async () => {
    const d = setup(5);
    await d.refresh();
    expect(d.applyPending()).toBe('unchanged');
    expect(d.publish).not.toHaveBeenCalled();
  });
});
