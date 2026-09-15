import * as React from 'react';
import { createSoundBank } from '@/features/challenge/sound-engine';

// Each bank is made on the first mount that asks for it and kept for the
// app's run: its sounds are decoded once, and a screen mounted again (the
// next challenge) finds them ready. Keyed by the sources' identity.
const banks = new Map<readonly number[], ReturnType<typeof createSoundBank>>();

// The variants of one sound, decoded up front so that each plays without a
// delay. `sources` must keep its identity (a module constant).
export function useSoundBank(sources: readonly number[]) {
  const [bank] = React.useState(() => {
    let made = banks.get(sources);
    if (!made) {
      made = createSoundBank(sources);
      banks.set(sources, made);
    }
    return made;
  });
  return bank;
}
