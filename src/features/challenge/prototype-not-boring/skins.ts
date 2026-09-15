// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.

export type SkinName = 'white' | 'chrome';

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
  // Extrusion sides, from the layer furthest back to the one under the face.
  sideBack: string;
  sideFront: string;
  // Face gradient stops. `light` lights each digit on its own from the tilt;
  // `sweep` runs one mirrored band pattern across the whole number.
  face: string[];
  faceMode: 'light' | 'sweep';
  // Thin rim around the face, where it meets the sides.
  edge: string;
  // Cast on the background behind the number.
  shadow: string;
  // Halo behind the number, or none.
  glow: string | null;
  // The calculation cards (problem-cards.tsx). Faces run from the lit corner
  // to the shaded one: dim for the side cards, lit for the current one,
  // green or red once answered. Sides as for the digits; the rim lights the
  // top edge.
  card: {
    dim: [string, string];
    lit: [string, string];
    correct: [string, string];
    wrong: [string, string];
    sideFront: string;
    sideBack: string;
    rim: string;
  };
};

export const SKINS: Record<SkinName, Skin> = {
  white: {
    background: '#161616',
    ink: '#F2F2F2',
    muted: '#7A7A7A',
    accent: '#FFA630',
    correct: '#5BE37D',
    wrong: '#FF5A5A',
    sideBack: '#2E2E2E',
    sideFront: '#A9A9A9',
    face: ['#FFFFFF', '#F3F3F3', '#C9C9C9'],
    faceMode: 'light',
    edge: 'rgba(255, 255, 255, 0.9)',
    shadow: 'rgba(0, 0, 0, 0.75)',
    glow: null,
    // Graphite, the same neutral as the page; deep green and red, whose
    // bright answers still read on them.
    card: {
      dim: ['#262626', '#1B1B1B'],
      lit: ['#3C3C3C', '#262626'],
      correct: ['#1E5A31', '#133B21'],
      wrong: ['#6A2323', '#431616'],
      sideFront: '#141414',
      sideBack: '#050505',
      rim: 'rgba(255, 255, 255, 0.22)',
    },
  },
  chrome: {
    background: '#07060D',
    ink: '#EDEBFF',
    muted: '#6E6A8A',
    accent: '#B9A4FF',
    correct: '#6CF0B0',
    wrong: '#FF6FA0',
    sideBack: '#0E0826',
    sideFront: '#5B44D6',
    face: ['#FFFFFF', '#B8A6FF', '#FF8FD8', '#7FE3FF', '#FFFFFF', '#6C4CFF'],
    faceMode: 'sweep',
    edge: 'rgba(255, 255, 255, 0.75)',
    shadow: 'rgba(0, 0, 0, 0.9)',
    glow: 'rgba(140, 100, 255, 0.5)',
    card: {
      dim: ['#17122E', '#0F0B1F'],
      lit: ['#2A2150', '#17122E'],
      correct: ['#12503A', '#0B3024'],
      wrong: ['#5C1838', '#3A0F24'],
      sideFront: '#120C2A',
      sideBack: '#05030C',
      rim: 'rgba(185, 164, 255, 0.35)',
    },
  },
};
