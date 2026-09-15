import * as React from 'react';
import { useSoundBank } from '@/features/challenge/use-sound-bank';
// Synthesized by scripts/generate-challenge-sounds.mjs (pnpm sounds:challenge).
import cancelOne from '@/features/home/sounds/menu-cancel-1.wav';
import cancelTwo from '@/features/home/sounds/menu-cancel-2.wav';
import firstCardOne from '@/features/home/sounds/menu-card-1-1.wav';
import firstCardTwo from '@/features/home/sounds/menu-card-1-2.wav';
import firstCardThree from '@/features/home/sounds/menu-card-1-3.wav';
import firstCardFour from '@/features/home/sounds/menu-card-1-4.wav';
import secondCardOne from '@/features/home/sounds/menu-card-2-1.wav';
import secondCardTwo from '@/features/home/sounds/menu-card-2-2.wav';
import secondCardThree from '@/features/home/sounds/menu-card-2-3.wav';
import secondCardFour from '@/features/home/sounds/menu-card-2-4.wav';
import entrySound from '@/features/home/sounds/menu-entry.wav';
import sheetSound from '@/features/home/sounds/menu-sheet.wav';
import startSound from '@/features/home/sounds/menu-start.wav';

// The home menu's sounds, as picked on its bench: drums for the gestures (a
// stick on the rim, a rubber stamp, a brush) and one chord, Start's, on the
// brass, which the countdown's first note resolves. Quieter than the
// challenge's.

// Module constants: a bank's sources must keep their identity.
const ENTRY = [entrySound];
// Each card its own stick on the rim, the second higher.
const FIRST_CARD = [firstCardOne, firstCardTwo, firstCardThree, firstCardFour];
const SECOND_CARD = [secondCardOne, secondCardTwo, secondCardThree, secondCardFour];
const SHEET = [sheetSound];
const START = [startSound];
const CANCEL = [cancelOne, cancelTwo];

export function useMenuSounds() {
  const entry = useSoundBank(ENTRY);
  const firstCard = useSoundBank(FIRST_CARD);
  const secondCard = useSoundBank(SECOND_CARD);
  const sheet = useSoundBank(SHEET);
  const start = useSoundBank(START);
  const cancel = useSoundBank(CANCEL);

  return React.useMemo(() => {
    const cards = [firstCard, secondCard];
    return {
      // Timed on the title's entrance (home-title.tsx): play it as that starts.
      playEntry: () => entry.play(0),
      // A card touched, by its place in the menu: any past the second sounds
      // like the second.
      playCard: (step: number) => cards[Math.min(step, cards.length - 1)]?.playNext(),
      // As the sheet's count is stamped down.
      playSheet: () => sheet.play(0),
      playStart: () => start.play(0),
      // However the sheet is closed without starting: Cancel, a swipe, the backdrop.
      playCancel: () => cancel.playNext(),
    };
  }, [entry, firstCard, secondCard, sheet, start, cancel]);
}
