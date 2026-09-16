// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.

export type Skin = {
  background: string;
  // Keypad digits.
  ink: string;
  // Equation, timer, secondary keys.
  muted: string;
  // Operators and the = key.
  accent: string;
  correct: string;
  wrong: string;
};

export const SKINS = {
  white: {
    background: '#161616',
    ink: '#F2F2F2',
    muted: '#7A7A7A',
    accent: '#FFA630',
    correct: '#5BE37D',
    wrong: '#FF5A5A',
  },
} satisfies Record<'white', Skin>;
