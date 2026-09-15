import { streakStatus } from '@/features/challenge/streak';

const MILESTONES = [4, 10, 15];

describe('streakStatus', () => {
  it('is not a streak before the first milestone', () => {
    expect(streakStatus(3, MILESTONES)).toEqual({ inStreak: false, atMilestone: false, level: 0 });
  });

  it('starts the streak at the first milestone', () => {
    expect(streakStatus(4, MILESTONES)).toEqual({ inStreak: true, atMilestone: true, level: 1 });
  });

  it('stays in the streak between milestones, without a new milestone', () => {
    expect(streakStatus(7, MILESTONES)).toEqual({ inStreak: true, atMilestone: false, level: 1 });
  });

  it('steps up at each next milestone and stays at the last one beyond it', () => {
    expect(streakStatus(10, MILESTONES)).toEqual({ inStreak: true, atMilestone: true, level: 2 });
    expect(streakStatus(15, MILESTONES)).toEqual({ inStreak: true, atMilestone: true, level: 3 });
    expect(streakStatus(18, MILESTONES)).toEqual({ inStreak: true, atMilestone: false, level: 3 });
  });

  it('ends with a mistake', () => {
    expect(streakStatus(0, MILESTONES)).toEqual({ inStreak: false, atMilestone: false, level: 0 });
  });

  it('never starts without milestones', () => {
    expect(streakStatus(12, [])).toEqual({ inStreak: false, atMilestone: false, level: 0 });
  });
});
