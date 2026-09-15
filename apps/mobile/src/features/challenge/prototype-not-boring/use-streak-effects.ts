import type { GlowFlash } from '@/features/challenge/prototype-not-boring/streak-glow';
import type { RaysBurst } from '@/features/challenge/prototype-not-boring/streak-rays';
import * as React from 'react';
import { streakMilestoneHaptic } from '@/features/challenge/haptics';
import { streakStatus } from '@/features/challenge/streak';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// What a streak shows, updated on each answer: the glow's level, stepping up
// at each milestone and out at a mistake; and at each milestone, a flash of
// the glow and a burst of speed lines. onAnswer returns the answer's streak
// status, for its sound.

type Effects = { level: number; flash: GlowFlash | null; rays: RaysBurst | null };

const NONE: Effects = { level: 0, flash: null, rays: null };

export function useStreakEffects(milestones: readonly number[]) {
  const [effects, setEffects] = React.useState<Effects>(NONE);

  // streak: the correct answers in a row ending with this one, 0 if wrong.
  const onAnswer = React.useCallback(
    (streak: number) => {
      const status = streakStatus(streak, milestones);
      const id = Date.now();
      if (status.atMilestone) {
        setEffects({ level: status.level, flash: { id, level: status.level }, rays: { id, level: status.level } });
        streakMilestoneHaptic();
      }
      else {
        setEffects(current => ({ ...current, level: status.level }));
      }
      return status;
    },
    [milestones],
  );
  // A new run starts with the glow out.
  const reset = React.useCallback(() => setEffects(NONE), []);

  return { ...effects, levels: milestones.length, onAnswer, reset };
}
