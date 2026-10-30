import { createExitTracker } from '../../src/game/rendering/exitTracker';
import type { Vehicle } from '../../src/game/models/Vehicle';
const a: Vehicle = {
  id: 'a',
  type: 'car',
  x: 0,
  y: 0,
  width: 2,
  height: 1,
  direction: 'right',
  color: 'red',
};
const b: Vehicle = { ...a, id: 'b', y: 1 };
describe('escaped sprite cleanup', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('does not cancel the first exit when another move occurs', () => {
    const notify = jest.fn();
    const tracker = createExitTracker(notify, 380);
    tracker.update([a, b], [b]);
    jest.advanceTimersByTime(100);
    tracker.update([b], []);
    jest.advanceTimersByTime(280);
    expect(notify.mock.calls.at(-1)?.[0]).toEqual([b]);
    jest.advanceTimersByTime(100);
    expect(notify.mock.calls.at(-1)?.[0]).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('undo and re-exit cannot leave duplicates or use an old timeout', () => {
    const notify = jest.fn();
    const tracker = createExitTracker(notify, 380);
    tracker.update([a], []);
    jest.advanceTimersByTime(100);
    tracker.update([], [a]);
    expect(notify.mock.calls.at(-1)?.[0]).toEqual([]);
    tracker.update([a], []);
    jest.advanceTimersByTime(280);
    expect(notify.mock.calls.at(-1)?.[0]).toEqual([a]);
    jest.advanceTimersByTime(100);
    expect(notify.mock.calls.at(-1)?.[0]).toEqual([]);
  });
  it('unmount cancels every remaining timer', () => {
    const tracker = createExitTracker(jest.fn(), 380);
    tracker.update([a, b], []);
    tracker.dispose();
    expect(jest.getTimerCount()).toBe(0);
  });
});
