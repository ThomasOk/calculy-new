import * as React from 'react';
// Synthesized by scripts/generate-challenge-sounds.mjs (pnpm sounds:challenge).
import eraseOne from '@/features/challenge/sounds/jazz-erase-1.wav';
import eraseTwo from '@/features/challenge/sounds/jazz-erase-2.wav';
import eraseThree from '@/features/challenge/sounds/jazz-erase-3.wav';
import eraseFour from '@/features/challenge/sounds/jazz-erase-4.wav';
import { useSoundBank } from '@/features/challenge/use-sound-bank';

const ERASE = [eraseOne, eraseTwo, eraseThree, eraseFour];

// "Acid jazz" from the Pagaille sound bench, on the erase key: a record
// scratched back, four variants. The digits have no sound, and "=" neither:
// the answer's sound replaces it.
export function useKeySounds() {
  const erase = useSoundBank(ERASE);
  return React.useMemo(() => ({ playErase: erase.playNext }), [erase]);
}
