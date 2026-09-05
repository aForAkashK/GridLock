/**
 * "Save your progress" nudge (DECISIONS.md D-003).
 *
 * A dismissible prompt, never a gate. It exists because an unlinked anonymous
 * player who reinstalls on Android is genuinely unrecoverable, and the silent
 * platform link does not always succeed.
 *
 * Timing matters: asking at level 1 gets declined. Asking once the player has
 * something to lose gets accepted.
 */

import { storage, StorageKeys, getBool } from '../storage/mmkv';

const TRIGGER_LEVEL = 10;
const TRIGGER_COIN_BALANCE = 500;

export function shouldShowNudge(args: {
  completedLevelCount: number;
  coinBalance: number;
  hasRecoverableIdentity: boolean;
}): boolean {
  if (args.hasRecoverableIdentity) {
    return false;
  }
  if (getBool(StorageKeys.saveProgressNudgeSeen, false)) {
    return false;
  }
  return (
    args.completedLevelCount >= TRIGGER_LEVEL ||
    args.coinBalance >= TRIGGER_COIN_BALANCE
  );
}

/** Called on accept OR dismiss — we ask once, never nag. */
export function markNudgeSeen(): void {
  storage.set(StorageKeys.saveProgressNudgeSeen, true);
}
