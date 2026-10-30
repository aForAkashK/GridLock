import { coinService } from "../coins/coinService";
import { getJSON, getNumber, storage, StorageKeys } from "../storage/mmkv";
import { queueSync } from "../sync/syncQueue";
import { awardStatus, awardsProgress } from "./policy";
import { readAwardsProgress } from "./storage";
import { commitAwardClaim } from "./ledger";
export type AwardClaimResult =
  | { claimed: true; amount: number }
  | {
      claimed: false;
      reason: "locked" | "already_claimed" | "recovery_pending" | "unknown";
    };
export function claimAward(id: string): AwardClaimResult {
  const balance = coinService.getBalance();
  if (storage.getString(StorageKeys.pendingAccountRestore))
    return { claimed: false, reason: "recovery_pending" };
  const progress = readAwardsProgress();
  const status = awardStatus(
    id,
    progress,
    getJSON<number[]>(StorageKeys.completedLevels, [])
  );
  if (!status) return { claimed: false, reason: "unknown" };
  if (status.claimed) return { claimed: false, reason: "already_claimed" };
  if (!status.unlocked) return { claimed: false, reason: "locked" };
  commitAwardClaim({
    awardId: status.award.id,
    progressAfter: awardsProgress({
      ...progress,
      claimedIds: [...progress.claimedIds, status.award.id],
    }),
    coinsAfter: balance + status.award.reward,
    versionAfter: getNumber(StorageKeys.syncVersion, 0) + 1,
  });
  queueSync("achievement");
  return { claimed: true, amount: status.award.reward };
}
