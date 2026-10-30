import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { usePlayerStore } from "../state/playerStore";
import { dailyStatus, nextMidnight } from "../services/rewards/dailyPolicy";

/** One midnight timer while focused/active; no polling or background interval. */
export function useDailyRewardStatus() {
  const record = usePlayerStore((state) => state.dailyReward);
  const [, setNow] = useState(Date.now);
  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const refresh = () => {
        clearTimeout(timer);
        const current = Date.now();
        setNow(current);
        const wait = nextMidnight(current) - current;
        timer = setTimeout(
          refresh,
          Number.isFinite(wait) ? Math.max(250, wait + 100) : 60000
        );
      };
      refresh();
      const listener = AppState.addEventListener("change", (state) => {
        clearTimeout(timer);
        if (state === "active") {
          refresh();
        }
      });
      return () => {
        clearTimeout(timer);
        listener.remove();
      };
    }, [])
  );
  return dailyStatus(record, Date.now());
}
