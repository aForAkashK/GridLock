import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { localDay } from "../../src/services/rewards/dailyPolicy";
let mockRecord: {
  lastClaimDay: number;
  lastClaimAt: number;
  streak: number;
} | null = null;
let mockChange: (state: string) => void;
const mockRemove = jest.fn();
jest.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (_event: string, callback: (state: string) => void) => {
      mockChange = callback;
      return { remove: mockRemove };
    },
  },
}));
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => () => void) =>
    require("react").useEffect(effect, [effect]),
}));
jest.mock("../../src/state/playerStore", () => ({
  usePlayerStore: (selector: (state: unknown) => unknown) =>
    selector({ dailyReward: mockRecord }),
}));
import { useDailyRewardStatus } from "../../src/hooks/useDailyRewardStatus";
let observed: ReturnType<typeof useDailyRewardStatus>;
function Probe() {
  observed = useDailyRewardStatus();
  return null;
}
describe("daily screen refresh lifecycle", () => {
  let renderer: ReactTestRenderer;
  beforeEach(() => {
    jest.useFakeTimers();
    mockRemove.mockClear();
    mockRecord = null;
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(() => {
    act(() => renderer?.unmount());
    jest.useRealTimers();
  });
  it("unlocks the next calendar day at midnight without polling or a remount", () => {
    const before = new Date(2026, 9, 26, 23, 59, 59).getTime();
    jest.setSystemTime(before);
    mockRecord = {
      lastClaimDay: localDay(before),
      lastClaimAt: before,
      streak: 1,
    };
    act(() => {
      renderer = create(<Probe />);
    });
    expect(observed.claimed).toBe(true);
    expect(jest.getTimerCount()).toBe(1);
    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(observed).toMatchObject({ available: true, streak: 2, amount: 30 });
    expect(jest.getTimerCount()).toBe(1);
  });
  it("stops the timer in background, refreshes on return, and detaches on blur/unmount", () => {
    const before = new Date(2026, 9, 26, 12).getTime();
    jest.setSystemTime(before);
    mockRecord = {
      lastClaimDay: localDay(before),
      lastClaimAt: before,
      streak: 4,
    };
    act(() => {
      renderer = create(<Probe />);
    });
    act(() => mockChange("background"));
    expect(jest.getTimerCount()).toBe(0);
    act(() => {
      jest.setSystemTime(new Date(2026, 9, 28, 12).getTime());
      mockChange("active");
    });
    expect(observed).toMatchObject({ available: true, streak: 1, amount: 20 });
    act(() => renderer.unmount());
    expect(jest.getTimerCount()).toBe(0);
    expect(mockRemove).toHaveBeenCalled();
  });
});
