import * as React from 'react';
// Synthesized by scripts/generate-challenge-sounds.mjs (pnpm sounds:challenge).
import correctOne from '@/features/challenge/sounds/jazz-correct-1.wav';
import correctTwo from '@/features/challenge/sounds/jazz-correct-2.wav';
import correctThree from '@/features/challenge/sounds/jazz-correct-3.wav';
import correctFour from '@/features/challenge/sounds/jazz-correct-4.wav';
import correctFive from '@/features/challenge/sounds/jazz-correct-5.wav';
import correctSix from '@/features/challenge/sounds/jazz-correct-6.wav';
import correctSeven from '@/features/challenge/sounds/jazz-correct-7.wav';
import correctEight from '@/features/challenge/sounds/jazz-correct-8.wav';
import wrongOne from '@/features/challenge/sounds/jazz-wrong-1.wav';
import wrongTwo from '@/features/challenge/sounds/jazz-wrong-2.wav';
import wrongThree from '@/features/challenge/sounds/jazz-wrong-3.wav';
import wrongFour from '@/features/challenge/sounds/jazz-wrong-4.wav';
import { useSoundBank } from '@/features/challenge/use-sound-bank';

const CORRECT = [correctOne, correctTwo, correctThree, correctFour, correctFive, correctSix, correctSeven, correctEight];
const WRONG = [wrongOne, wrongTwo, wrongThree, wrongFour];

// "Acid jazz" from the Pagaille sound bench. A correct answer is "Cadence":
// two notes lean, then the E chord answers, on the Rhodes, with a snap on
// the arrival; eight variants. A wrong one is a brass note falling a
// tritone. Same "Cadence" whether or not it's part of a streak — the
// streak's own visuals (glow, rays) carry that instead.
export function useAnswerSounds() {
  const correct = useSoundBank(CORRECT);
  const wrong = useSoundBank(WRONG);

  return React.useCallback(
    (isCorrect: boolean) => {
      if (!isCorrect) {
        wrong.playNext();
        return;
      }
      correct.playNext();
    },
    [correct, wrong],
  );
}
