/** Initial balance and earning/sink prices; tune from playtest evidence. */
export const STARTING_COINS = 100;
export const DAILY_REWARDS = [20, 30, 40, 50, 60, 80, 100] as const;
/** Reward ladder and pass prices live in services/ads/policy.ts. */
/** Planned cosmetic prices. Existing default vehicles/colours stay free. */
export const SKIN_PRICES = {
  standard: 300,
  truck: 400,
  bus: 450,
  specialVehicle: 900,
  themedPack: 1800,
} as const;
