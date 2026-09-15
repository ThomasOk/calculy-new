import * as React from 'react';
// Synthesized by scripts/generate-challenge-sounds.mjs (pnpm sounds:challenge).
import countOneSound from '@/features/challenge/sounds/jazz-countdown-1.wav';
import countTwoSound from '@/features/challenge/sounds/jazz-countdown-2.wav';
import countThreeSound from '@/features/challenge/sounds/jazz-countdown-3.wav';
import goSound from '@/features/challenge/sounds/jazz-countdown-go.wav';
import { useSoundBank } from '@/features/challenge/use-sound-bank';

// By count: the 1's note first.
const COUNTS = [countOneSound, countTwoSound, countThreeSound];
const GO = [goSound];

// "Acid jazz" from the Pagaille sound bench: each digit is a finger snap
// with a Rhodes note climbing the E major chord (3 on E5, 2 on G#5, 1 on B5),
// and the whole band plays the go.
export function useCountdownSounds() {
  // Decoded up front so the 3 plays as soon as it shows.
  const counts = useSoundBank(COUNTS);
  const go = useSoundBank(GO);

  return React.useMemo(() => ({
    // A count above 3 has no note and stays silent.
    playCount: (count: number) => {
      if (count >= 1 && count <= COUNTS.length)
        counts.play(count - 1);
    },
    playGo: () => go.play(0),
  }), [counts, go]);
}
