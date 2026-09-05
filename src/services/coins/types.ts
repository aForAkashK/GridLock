/**
 * Coin service contract.
 *
 * Everything in the game talks to this interface, never to Firestore directly.
 * That indirection is what lets a server-authoritative ledger replace the
 * client implementation later without touching gameplay code.
 */

export type CoinReason =
  | 'level_complete'
  | 'daily_reward'
  | 'rewarded_ad'
  | 'achievement'
  | 'iap'
  | 'hint'
  | 'undo'
  | 'reset'
  | 'skip';

/** PRD section 20. Single source of truth for the economy. */
export const COIN_REWARDS = {
  level_complete: 10,
  daily_reward: 50,
  rewarded_ad: 30,
  achievement: 100,
} as const;

export const COIN_COSTS = {
  hint: 30,
  undo: 20,
  reset: 10,
  skip: 100,
} as const;

export interface CoinService {
  /** Synchronous — reads local state, never the network. */
  getBalance(): number;
  /** Returns the new balance. Never awaits the network. */
  earn(amount: number, reason: CoinReason): number;
  /**
   * Returns false when the player cannot afford it, leaving the balance
   * untouched. Callers must check the result before granting the item.
   */
  spend(amount: number, reason: CoinReason): boolean;
  canAfford(amount: number): boolean;
}
