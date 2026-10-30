import {
  monetization,
  mergeMonetization,
  type Monetization,
} from "../ads/policy";
import { inventory, mergeInventory, type Inventory } from "../shop/policy";
/** Existing-account coins win; progress is unioned. Never add two balances. */
import { latestDaily, type DailyRecord } from "../rewards/dailyPolicy";
import {
  awardsProgress,
  mergeAwards,
  hasAwardsProgress,
  type AwardsProgress,
} from "../awards/policy";
import { mergeProgress, type Progress } from "../sync/mergeProgress";
export type RecoverySnapshot = Progress & {
  coins: number;
  monetization?: Monetization;
  inventory?: Inventory;
  awardsProgress?: AwardsProgress;
  dailyReward?: DailyRecord;
  syncVersion: number;
};
export function recoveredPlayer(
  local: RecoverySnapshot,
  cloud: RecoverySnapshot | null
): RecoverySnapshot {
  const progress = mergeProgress(local, cloud).merged;
  const dailyReward = latestDaily(
    local.dailyReward ?? null,
    cloud?.dailyReward ?? null
  );
  const awards = mergeAwards(
    awardsProgress(local.awardsProgress, local.dailyReward?.streak ?? 0),
    awardsProgress(cloud?.awardsProgress, cloud?.dailyReward?.streak ?? 0)
  );
  return {
    ...progress,
    ...(local.monetization || cloud?.monetization
      ? {
          monetization: mergeMonetization(
            monetization(local.monetization),
            monetization(cloud?.monetization)
          ),
        }
      : {}),
    ...(local.inventory || cloud?.inventory
      ? {
          inventory: mergeInventory(
            inventory(
              local.inventory?.owned,
              local.inventory?.selected,
              undefined,
              local.inventory?.slots
            ),
            inventory(
              cloud?.inventory?.owned,
              cloud?.inventory?.selected,
              undefined,
              cloud?.inventory?.slots
            ),
            !!cloud?.inventory
          ),
        }
      : {}),
    ...(hasAwardsProgress(awards) ? { awardsProgress: awards } : {}),
    ...(dailyReward ? { dailyReward } : {}),
    coins: cloud?.coins ?? local.coins,
    syncVersion: cloud?.syncVersion ?? local.syncVersion,
  };
}
