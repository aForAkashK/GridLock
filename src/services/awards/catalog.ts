export type AwardMetric = "completed" | "perfect" | "streak";
export const AWARDS = [
  {
    id: "first_escape",
    title: "First Escape",
    description: "Complete your first level",
    metric: "completed",
    goal: 1,
    reward: 25,
  },
  {
    id: "traffic_tamer",
    title: "Traffic Tamer",
    description: "Complete 10 different levels",
    metric: "completed",
    goal: 10,
    reward: 50,
  },
  {
    id: "puzzle_pro",
    title: "Puzzle Pro",
    description: "Complete 25 different levels",
    metric: "completed",
    goal: 25,
    reward: 100,
  },
  {
    id: "halfway_hero",
    title: "Halfway Hero",
    description: "Complete 50 different levels",
    metric: "completed",
    goal: 50,
    reward: 150,
  },
  {
    id: "road_master",
    title: "Road Master",
    description: "Complete 100 different levels",
    metric: "completed",
    goal: 100,
    reward: 300,
  },
  {
    id: "perfect_start",
    title: "Perfect Start",
    description: "Solve a level at par or better",
    metric: "perfect",
    goal: 1,
    reward: 25,
  },
  {
    id: "clean_run",
    title: "Clean Run",
    description: "Solve 5 different levels at par or better",
    metric: "perfect",
    goal: 5,
    reward: 50,
  },
  {
    id: "perfect_route",
    title: "Perfect Route",
    description: "Solve 10 different levels at par or better",
    metric: "perfect",
    goal: 10,
    reward: 100,
  },
  {
    id: "daily_driver",
    title: "Daily Driver",
    description: "Claim daily coins 3 days in a row",
    metric: "streak",
    goal: 3,
    reward: 50,
  },
  {
    id: "week_champion",
    title: "Week Champion",
    description: "Claim daily coins 7 days in a row",
    metric: "streak",
    goal: 7,
    reward: 100,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  description: string;
  metric: AwardMetric;
  goal: number;
  reward: number;
}>;
export type AwardId = (typeof AWARDS)[number]["id"];
export function awardById(id: string) {
  return AWARDS.find((award) => award.id === id);
}
