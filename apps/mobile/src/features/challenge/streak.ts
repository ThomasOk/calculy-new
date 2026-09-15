// A streak is celebrated at milestones: counts of correct answers in a row,
// set per challenge (challenges.ts). From the first milestone on, the run is
// in a streak until the next mistake; reaching a milestone is a moment of its
// own, and each one reached takes the streak a level deeper.
export type StreakStatus = {
  // At or past the first milestone.
  inStreak: boolean;
  // This answer reached a milestone.
  atMilestone: boolean;
  // How many milestones are reached: 0 outside a streak.
  level: number;
};

// streak: the correct answers in a row, 0 after a mistake.
export function streakStatus(streak: number, milestones: readonly number[]): StreakStatus {
  const level = milestones.filter(milestone => streak >= milestone).length;
  return { inStreak: level > 0, atMilestone: milestones.includes(streak), level };
}
