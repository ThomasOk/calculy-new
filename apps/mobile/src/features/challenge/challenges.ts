// The challenges offered on the home screen. The id is the route segment:
// /challenge/calculy-20.
export type Challenge = {
  id: string;
  problemCount: number;
  // Correct answers in a row that start a streak, then take it deeper
  // (streak.ts).
  streakMilestones: readonly number[];
};

export const CHALLENGES: Challenge[] = [
  { id: 'calculy-20', problemCount: 20, streakMilestones: [4, 10, 15] },
  // Calculy 20's, then one every 5, so the second half has its moments too.
  { id: 'calculy-30', problemCount: 30, streakMilestones: [4, 10, 15, 20, 25] },
];

export function findChallenge(id: string | undefined) {
  return CHALLENGES.find(challenge => challenge.id === id);
}

// The app's name, the same in every language.
export const PRODUCT_NAME = 'Calculy';

// A product name, the same in every language.
export function challengeTitle({ problemCount }: Challenge) {
  return `${PRODUCT_NAME} ${problemCount}`;
}
