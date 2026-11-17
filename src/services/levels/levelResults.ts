import { isWon, type GameState } from "../../game/models/GameState";
import type { Level } from "../../game/models/Level";
import { recordPerfect } from "../awards/policy";
import { readAwardsProgress } from "../awards/storage";
import { coinService } from "../coins/coinService";
import { COIN_REWARDS } from "../coins/types";
import { commitCoinTransaction } from "../coins/transaction";
import { getJSON, getNumber, storage, StorageKeys } from "../storage/mmkv";
import { queueSync } from "../sync/syncQueue";
import { mergeLevelStars, rateSolve } from "./ratings";

export function readLevelStars() {
  return mergeLevelStars(getJSON(StorageKeys.levelStars, null));
}

/** Commit unlock, best rating, award facts and coins together before presenting results. */
export function saveLevelResult(
  level: Level,
  state: GameState,
  skipped: boolean
) {
  const balance = coinService.getBalance();
  if (
    storage.getString(StorageKeys.pendingAccountRestore) ||
    state.levelId !== level.id ||
    state.status !== "won" ||
    !isWon(state)
  )
    return null;

  const completed = getJSON<number[]>(StorageKeys.completedLevels, []);
  const firstClear = !completed.includes(level.id);
  const stars = skipped ? 0 : rateSolve(state.moveCount, level.parMoves);
  const previousStars = readLevelStars();
  const previousAwards = readAwardsProgress();
  const awards =
    stars === 3
      ? recordPerfect(previousAwards, level.id, state.moveCount, level.parMoves)
      : previousAwards;
  const improved = stars !== 0 && stars > (previousStars[level.id] ?? 0);
  if (!firstClear && !improved && awards === previousAwards) return 0;

  const amount = firstClear && !skipped ? COIN_REWARDS.level_complete : 0;
  commitCoinTransaction({
    versionAfter: getNumber(StorageKeys.syncVersion, 0) + 1,
    recordHistory: amount > 0,
    entry: {
      id: "level_complete:" + level.id,
      at: Date.now(),
      amount,
      balance: balance + amount,
      label: "Level " + level.id + " completed",
    },
    levelResultAfter: {
      completedLevels: firstClear ? [...completed, level.id] : completed,
      currentLevel: Math.max(
        getNumber(StorageKeys.currentLevel, 1),
        level.id + 1
      ),
      stars: improved ? { ...previousStars, [level.id]: stars } : previousStars,
      awards,
    },
  });
  queueSync(amount > 0 ? "level_complete" : "progress");
  return amount;
}
