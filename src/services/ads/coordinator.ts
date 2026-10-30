import type { RewardIntent, RewardPurpose } from "./policy";
export type AdKind = "rewarded" | "interstitial";
export type AdEvent = "loaded" | "earned" | "closed" | "error";
export type AdPort = {
  load: () => void;
  show: () => Promise<void>;
  destroy: () => void;
};
export type AdState = {
  ready: boolean;
  rewardedReady: boolean;
  interstitialReady: boolean;
  showing: boolean;
  message: string;
  privacyRequired: boolean;
};
type Context = {
  kind: AdKind;
  port: AdPort;
  loadedAt: number;
  used: boolean;
  earned: boolean;
  intent?: RewardIntent;
  after?: () => void;
  timer?: ReturnType<typeof setTimeout>;
};
export type AdDependencies = {
  initialize: () => Promise<{ allowed: boolean; privacyRequired: boolean }>;
  create: (kind: AdKind, event: (event: AdEvent) => void) => AdPort;
  now: () => number;
  foreground: () => boolean;
  adFree: () => boolean;
  levelAdBreak: (adFree: boolean) => boolean;
  prepare: (purpose: RewardPurpose) => RewardIntent | null;
  grant: (intent: RewardIntent) => boolean;
  refresh: () => void;
  audio: (paused: boolean) => void;
};
export class AdCoordinator {
  state: AdState = {
    ready: false,
    rewardedReady: false,
    interstitialReady: false,
    showing: false,
    message: "Preparing ads…",
    privacyRequired: false,
  };
  private ads: Partial<Record<AdKind, Context>> = {};
  private listeners = new Set<(state: AdState) => void>();
  private starting: Promise<void> | null = null;
  private stopped = false;
  constructor(private deps: AdDependencies) {}
  subscribe(fn: (state: AdState) => void) {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private update(patch: Partial<AdState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }
  async start() {
    if (this.state.ready) {
      this.warm();
      return;
    }
    if (this.starting) return this.starting;
    this.stopped = false;
    this.starting = this.deps
      .initialize()
      .then((info) => {
        if (this.stopped) return;
        this.update({
          ready: info.allowed,
          privacyRequired: info.privacyRequired,
          message: info.allowed
            ? "Loading ads…"
            : "Ads are unavailable until privacy setup is complete.",
        });
        this.warm();
      })
      .catch(() => {
        if (!this.stopped)
          this.update({
            message: "Ads unavailable. Check your connection and retry.",
          });
      })
      .finally(() => {
        this.starting = null;
      });
    return this.starting;
  }
  warm() {
    if (!this.state.ready || !this.deps.foreground() || this.stopped) return;
    this.load("rewarded");
    if (!this.deps.adFree()) this.load("interstitial");
    else if (this.ads.interstitial && !this.ads.interstitial.used) {
      this.dispose(this.ads.interstitial);
      delete this.ads.interstitial;
      this.update({ interstitialReady: false });
    }
  }
  private dispose(context: Context) {
    clearTimeout(context.timer);
    try {
      context.port.destroy();
    } catch {}
  }
  private load(kind: AdKind) {
    const existing = this.ads[kind];
    if (
      existing &&
      (existing.used ||
        !existing.loadedAt ||
        this.deps.now() - existing.loadedAt < 55 * 60 * 1000)
    )
      return;
    if (existing) this.dispose(existing);
    delete this.ads[kind];
    this.update({
      [kind === "rewarded" ? "rewardedReady" : "interstitialReady"]: false,
    });
    let context: Context;
    let port: AdPort;
    try {
      port = this.deps.create(kind, (event) => this.event(context, event));
    } catch {
      this.update({ message: "Ad is unavailable. Retry shortly." });
      return;
    }
    context = { kind, port, loadedAt: 0, used: false, earned: false };
    this.ads[kind] = context;
    context.timer = setTimeout(() => this.event(context, "error"), 20000);
    try {
      port.load();
    } catch {
      this.event(context, "error");
    }
  }
  private event(context: Context | undefined, event: AdEvent) {
    if (!context || this.stopped || this.ads[context.kind] !== context) return;
    const key =
      context.kind === "rewarded" ? "rewardedReady" : "interstitialReady";
    if (event === "loaded" && !context.used) {
      clearTimeout(context.timer);
      context.loadedAt = this.deps.now();
      this.update({ [key]: true, message: "Ready" });
      return;
    }
    if (
      event === "earned" &&
      context.kind === "rewarded" &&
      context.used &&
      context.intent &&
      !context.earned
    ) {
      // Mark before applying: duplicate SDK callbacks cannot increment a reward twice.
      context.earned = true;
      try {
        const awarded = this.deps.grant(context.intent);
        this.deps.refresh();
        this.update({
          message: awarded
            ? context.intent.purpose === "coins"
              ? `Collected ${context.intent.amount} coins!`
              : "Ad-free pass progress saved."
            : "Reward could not be applied. Check account recovery or device time.",
        });
      } catch {
        this.update({
          message:
            "Reward saving was interrupted. Reopen this screen to recover it.",
        });
      }
      return;
    }
    if (event === "closed" || event === "error") {
      delete this.ads[context.kind];
      this.dispose(context);
      if (context.used) {
        this.deps.audio(false);
        this.update({
          showing: false,
          [key]: false,
          ...(context.kind === "rewarded" && !context.earned
            ? {
                message:
                  event === "closed"
                    ? "Ad closed before completion. No reward was granted."
                    : "Ad could not be shown. No reward was granted.",
              }
            : {}),
        });
        const after = context.after;
        context.after = undefined;
        after?.();
        this.warm();
      } else
        this.update({
          [key]: false,
          message: "No ad available right now. Retry shortly.",
        });
    }
  }
  showRewarded(purpose: RewardPurpose, expectedCoins?: number): boolean {
    const context = this.available("rewarded");
    if (!context) {
      this.update({ message: "Ad is not ready. Please retry shortly." });
      this.warm();
      return false;
    }
    let intent: RewardIntent | null;
    try {
      intent = this.deps.prepare(purpose);
    } catch {
      this.update({
        message:
          "Could not prepare the reward. Retry after your save finishes recovering.",
      });
      return false;
    }
    if (!intent) {
      this.update({
        message:
          "Check your device time or finish account recovery. An active day pass cannot be earned again yet.",
      });
      return false;
    }
    if (
      purpose === "coins" &&
      expectedCoins !== undefined &&
      intent.amount !== expectedCoins
    ) {
      this.update({
        message:
          "A new day changed the coin reward. The amount has refreshed; tap again to continue.",
      });
      return false;
    }
    context.intent = intent;
    this.present(context);
    return true;
  }
  /** Returns immediately when no cached ad is available; never waits for a load. */
  showInterstitial(after: () => void): void {
    if (this.state.showing || !this.deps.foreground()) {
      after();
      return;
    }
    const adFree = this.deps.adFree();
    let due = false;
    try {
      due = this.deps.levelAdBreak(adFree);
    } catch {
      // A local persistence failure must never cause an extra forced ad.
    }
    const context = !adFree && due ? this.available("interstitial") : undefined;
    if (!context) {
      after();
      this.warm();
      return;
    }
    context.after = after;
    this.present(context);
  }
  private available(kind: AdKind) {
    const context = this.ads[kind];
    return !this.state.showing &&
      this.deps.foreground() &&
      context &&
      context.loadedAt &&
      !context.used &&
      this.deps.now() - context.loadedAt < 55 * 60 * 1000
      ? context
      : undefined;
  }
  private present(context: Context) {
    context.used = true;
    this.update({
      showing: true,
      [context.kind === "rewarded" ? "rewardedReady" : "interstitialReady"]:
        false,
    });
    this.deps.audio(true);
    try {
      context.port.show().catch(() => this.event(context, "error"));
    } catch {
      this.event(context, "error");
    }
  }
  allow(allowed: boolean, privacyRequired: boolean) {
    this.update({ ready: allowed, privacyRequired });
    if (!allowed) {
      Object.values(this.ads).forEach((context) => this.dispose(context));
      this.ads = {};
      this.update({ rewardedReady: false, interstitialReady: false });
    } else this.warm();
  }
  stop() {
    this.stopped = true;
    Object.values(this.ads).forEach((context) => this.dispose(context));
    this.ads = {};
    this.deps.audio(false);
    this.update({
      ready: false,
      showing: false,
      rewardedReady: false,
      interstitialReady: false,
    });
  }
}
