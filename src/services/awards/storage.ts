import { isWon, type GameState } from "../../game/models/GameState";
import type { Level } from "../../game/models/Level";
import { getJSON, setJSON, StorageKeys } from "../storage/mmkv";
import { parseDailyRecord } from "../rewards/dailyPolicy";
import { queueSync } from "../sync/syncQueue";
import { recoverAwardClaim } from "./ledger";
import { awardsProgress, recordPerfect, type AwardsProgress } from "./policy";
export function readAwardsProgress(): AwardsProgress {
  return awardsProgress(
    getJSON(StorageKeys.awardsProgress, null),
    parseDailyRecord(getJSON(StorageKeys.dailyReward, null))?.streak ?? 0
  );
}
function saveIfChanged(next: AwardsProgress): AwardsProgress {
  const previous = awardsProgress(getJSON(StorageKeys.awardsProgress, null));
  if (JSON.stringify(previous) !== JSON.stringify(next)) {
    setJSON(StorageKeys.awardsProgress, next);
    queueSync("progress");
  }
  return next;
}
export function captureDailyStreak(): AwardsProgress {
  if (recoverAwardClaim()) {
    queueSync("achievement");
  }
  return saveIfChanged(readAwardsProgress());
}
/** Replays can record their first perfect; skips/previews must never fabricate it. */
export function recordPerfectSolve(
  level: Level,
  state: GameState,
  skipped: boolean
): AwardsProgress {
  if (recoverAwardClaim()) {
    queueSync("achievement");
  }
  const previous = readAwardsProgress();
  if (
    skipped ||
    state.status !== "won" ||
    !isWon(state) ||
    state.levelId !== level.id
  )
    return previous;
  return saveIfChanged(
    recordPerfect(previous, level.id, state.moveCount, level.parMoves)
  );
}
