/**
 * Ads — PRD sections 21 and 23. Not wired for MVP v0.1.
 *
 * Two hard rules, enforced here rather than at call sites:
 *   - An interstitial never interrupts active gameplay. It may only be shown
 *     on the level-complete screen, at most every 3-4 completed levels.
 *   - Premium disables interstitial and banner ads. Rewarded ads stay, because
 *     they are opt-in and the player chose them.
 */

const INTERSTITIAL_EVERY_N_LEVELS = 4;

export type RewardedResult = { watched: boolean; coinsGranted: number };

export function shouldShowInterstitial(args: {
  completedLevelCount: number;
  premium: boolean;
}): boolean {
  if (args.premium) {
    return false;
  }
  return args.completedLevelCount % INTERSTITIAL_EVERY_N_LEVELS === 0;
}

export async function showInterstitial(): Promise<void> {
  // TODO(ads): v0.2
  throw new Error('Not implemented');
}

export async function showRewarded(): Promise<RewardedResult> {
  // TODO(ads): v0.2
  throw new Error('Not implemented');
}
