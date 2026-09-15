import * as React from 'react';
// Synthesized by scripts/generate-challenge-sounds.mjs (pnpm sounds:challenge).
import resultsSound from '@/features/challenge/sounds/jazz-results.wav';
import { useSoundBank } from '@/features/challenge/use-sound-bank';

const RESULTS = [resultsSound];

// "Acid jazz" from the Pagaille sound bench: a run up the Rhodes, then the
// chord with brass and a cymbal as the results show.
export function useResultsSound() {
  // Decoded up front so the chord lands with the score.
  const results = useSoundBank(RESULTS);

  return React.useCallback(() => results.play(0), [results]);
}
