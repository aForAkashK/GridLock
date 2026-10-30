import {
  AdCoordinator,
  type AdDependencies,
  type AdEvent,
  type AdKind,
} from "../../src/services/ads/coordinator";
import { nextLevelAdBreak } from "../../src/services/ads/policy";
function setup() {
  const callbacks: Partial<Record<AdKind, (event: AdEvent) => void>> = {},
    ports: Partial<
      Record<AdKind, { load: jest.Mock; show: jest.Mock; destroy: jest.Mock }>
    > = {};
  let free = false;
  const deps: AdDependencies = {
    initialize: jest.fn(async () => ({
      allowed: true,
      privacyRequired: false,
    })),
    create: (kind, fn) => {
      callbacks[kind] = fn;
      const port = {
        load: jest.fn(),
        show: jest.fn(async () => {}),
        destroy: jest.fn(),
      };
      ports[kind] = port;
      return port;
    },
    now: () => 100000,
    foreground: () => true,
    adFree: () => free,
    levelAdBreak: jest.fn((active: boolean) => !active),
    prepare: jest.fn((purpose) => ({
      id: "ad:1",
      purpose,
      day: 100,
      amount: purpose === "coins" ? 10 : 0,
      startedAt: 100000,
    })),
    grant: jest.fn(() => true),
    refresh: jest.fn(),
    audio: jest.fn(),
  };
  const ads = new AdCoordinator(deps);
  return {
    ads,
    deps,
    callbacks,
    ports,
    setFree: (value: boolean) => {
      free = value;
    },
  };
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
it("never rewards loading or early close, and grants only one earned callback", async () => {
  const { ads, deps, callbacks } = setup();
  await ads.start();
  callbacks.rewarded!("loaded");
  expect(deps.grant).not.toHaveBeenCalled();
  ads.showRewarded("coins");
  callbacks.rewarded!("closed");
  expect(deps.grant).not.toHaveBeenCalled();
  callbacks.rewarded!("loaded");
  ads.showRewarded("day_pass");
  callbacks.rewarded!("earned");
  callbacks.rewarded!("earned");
  expect(deps.grant).toHaveBeenCalledTimes(1);
  expect(deps.prepare).toHaveBeenLastCalledWith("day_pass");
  callbacks.rewarded!("closed");
  expect(ads.state.showing).toBe(false);
  ads.stop();
});
it("continues immediately when a level ad is not ready, then waits only for a ready ad to close", async () => {
  const { ads, callbacks, ports } = setup();
  const after = jest.fn();
  ads.showInterstitial(after);
  expect(after).toHaveBeenCalledTimes(1);
  await ads.start();
  callbacks.interstitial!("loaded");
  ads.showInterstitial(after);
  expect(ports.interstitial?.show).toHaveBeenCalledTimes(1);
  expect(after).toHaveBeenCalledTimes(1);
  callbacks.interstitial!("closed");
  expect(after).toHaveBeenCalledTimes(2);
  ads.stop();
});
it("honours passes at show time even if an interstitial was preloaded earlier", async () => {
  const { ads, callbacks, ports, setFree } = setup();
  await ads.start();
  callbacks.interstitial!("loaded");
  const port = ports.interstitial!;
  setFree(true);
  const after = jest.fn();
  ads.showInterstitial(after);
  expect(after).toHaveBeenCalledTimes(1);
  expect(port.show).not.toHaveBeenCalled();
  expect(port.destroy).toHaveBeenCalled();
  callbacks.rewarded!("loaded");
  expect(ads.showRewarded("coins")).toBe(true);
  ads.stop();
});
it("continues once on a show rejection and resumes audio", async () => {
  const { ads, callbacks, ports, deps } = setup();
  await ads.start();
  callbacks.interstitial!("loaded");
  ports.interstitial!.show.mockRejectedValueOnce(new Error("no activity"));
  const after = jest.fn();
  ads.showInterstitial(after);
  await Promise.resolve();
  expect(after).toHaveBeenCalledTimes(1);
  expect(deps.audio).toHaveBeenLastCalledWith(false);
  expect(ads.state.showing).toBe(false);
  ads.stop();
});
it("never creates native ads before consent permits requests", async () => {
  const { ads, deps } = setup();
  (deps.initialize as jest.Mock).mockResolvedValueOnce({
    allowed: false,
    privacyRequired: true,
  });
  await ads.start();
  expect(ads.state.ready).toBe(false);
  expect(ads.state.privacyRequired).toBe(true);
  expect(ads.showRewarded("coins")).toBe(false);
  ads.stop();
});
it("blocks simultaneous rewarded requests and times out stalled loads without awarding", async () => {
  const { ads, callbacks, deps } = setup();
  await ads.start();
  jest.advanceTimersByTime(20000);
  expect(ads.state.rewardedReady).toBe(false);
  expect(deps.grant).not.toHaveBeenCalled();
  ads.warm();
  callbacks.rewarded!("loaded");
  expect(ads.showRewarded("coins")).toBe(true);
  expect(ads.showRewarded("coins")).toBe(false);
  expect(deps.prepare).toHaveBeenCalledTimes(1);
  ads.stop();
});

it("does not show an ad when reward preparation fails", async () => {
  const { ads, callbacks, deps, ports } = setup();
  await ads.start();
  callbacks.rewarded!("loaded");
  (deps.prepare as jest.Mock).mockImplementationOnce(() => {
    throw new Error("storage interrupted");
  });
  expect(ads.showRewarded("coins")).toBe(false);
  expect(ports.rewarded?.show).not.toHaveBeenCalled();
  ads.stop();
});

it("does not show a coin ad with a stale amount displayed across midnight", async () => {
  const { ads, callbacks, ports } = setup();
  await ads.start();
  callbacks.rewarded!("loaded");
  expect(ads.showRewarded("coins", 50)).toBe(false);
  expect(ports.rewarded?.show).not.toHaveBeenCalled();
  expect(ads.showRewarded("coins", 10)).toBe(true);
  ads.stop();
});

it("shows only on each fourth real result break and resumes navigation after closing", async () => {
  const { ads, callbacks, ports, deps } = setup();
  let count = 0;
  deps.levelAdBreak = (free) => {
    const next = nextLevelAdBreak(count, free);
    count = next.completed;
    return next.due;
  };
  await ads.start();
  callbacks.interstitial!("loaded");
  const after = jest.fn();
  for (let round = 0; round < 3; round++) ads.showInterstitial(after);
  expect(after).toHaveBeenCalledTimes(3);
  expect(ports.interstitial!.show).not.toHaveBeenCalled();
  ads.showInterstitial(after);
  expect(ports.interstitial!.show).toHaveBeenCalledTimes(1);
  expect(after).toHaveBeenCalledTimes(3);
  callbacks.interstitial!("closed");
  expect(after).toHaveBeenCalledTimes(4);
  callbacks.interstitial!("loaded");
  const nextPort = ports.interstitial!;
  for (let round = 0; round < 3; round++) ads.showInterstitial(after);
  expect(nextPort.show).not.toHaveBeenCalled();
  ads.showInterstitial(after);
  expect(nextPort.show).toHaveBeenCalledTimes(1);
  ads.stop();
});
it("does not defer an unavailable fourth-level opportunity to the very next level", async () => {
  const { ads, callbacks, ports, deps } = setup();
  let count = 0;
  deps.levelAdBreak = (free) => {
    const next = nextLevelAdBreak(count, free);
    count = next.completed;
    return next.due;
  };
  await ads.start();
  const after = jest.fn();
  for (let round = 0; round < 4; round++) ads.showInterstitial(after);
  expect(after).toHaveBeenCalledTimes(4);
  callbacks.interstitial!("loaded");
  ads.showInterstitial(after);
  expect(ports.interstitial!.show).not.toHaveBeenCalled();
  expect(after).toHaveBeenCalledTimes(5);
  ads.stop();
});
it("continues without showing when local cadence cannot be saved", async () => {
  const { ads, callbacks, ports, deps } = setup();
  deps.levelAdBreak = () => {
    throw new Error("storage interrupted");
  };
  await ads.start();
  callbacks.interstitial!("loaded");
  const after = jest.fn();
  ads.showInterstitial(after);
  expect(after).toHaveBeenCalledTimes(1);
  expect(ports.interstitial!.show).not.toHaveBeenCalled();
  ads.stop();
});

it("does not consume level cadence while backgrounded or another ad is showing", async () => {
  const { ads, callbacks, deps } = setup();
  const after = jest.fn();
  deps.foreground = () => false;
  ads.showInterstitial(after);
  expect(deps.levelAdBreak).not.toHaveBeenCalled();
  deps.foreground = () => true;
  await ads.start();
  callbacks.rewarded!("loaded");
  ads.showRewarded("coins");
  ads.showInterstitial(after);
  expect(deps.levelAdBreak).not.toHaveBeenCalled();
  expect(after).toHaveBeenCalledTimes(2);
  ads.stop();
});

it("resets persisted pacing when an ad-free pass is active", async () => {
  const { ads, callbacks, deps, setFree } = setup();
  await ads.start();
  callbacks.interstitial!("loaded");
  setFree(true);
  ads.showInterstitial(jest.fn());
  expect(deps.levelAdBreak).toHaveBeenCalledWith(true);
  ads.stop();
});
