import type { TextStyle, ViewStyle } from 'react-native';

// The glossy "Aqua" recipe shared by the keys and the cards: a vertical
// gradient face with a same-hue rim and a lit inner edge, a white reflection
// over the top half, and a soft drop shadow on the container. Every layer is
// static: a state change crossfades whole layers, because gradients and
// shadows can't be transitioned without re-rendering them each frame.
//
// Colors are designed in OKLCH (noted beside each hex) and written as hex,
// which is all React Native parses. One cool neutral (H 255) runs through the
// background, the pearl faces, the ink and every shadow, so nothing reads as a
// different gray. Rims are opaque, one step darker in their face's hue:
// black at low alpha grays a colored edge out.

export type GlossTone = 'pearl' | 'blue' | 'green' | 'correct' | 'wrong';
export type GlossLayer = GlossTone | 'pressed';

// Sky: pale blue at the top fading to near-white under the keypad, where the
// glossy keys sit on white like buttons on a page.
// oklch(0.93 0.035 240) → oklch(0.985 0.006 240)
export const GLOSS_BACKGROUND = 'linear-gradient(to bottom, #D4ECFD, #F7FBFE)';
export const GLOSS_INK = '#272E38'; // oklch(0.3 0.02 255)
export const GLOSS_BLUE_LABEL = '#2266A4'; // oklch(0.5 0.12 250)

// Shadows and shades are the ink at low alpha, not black, so they stay in
// the palette's temperature.
const ink = (alpha: number) => `rgba(39, 46, 56, ${alpha})`;

const TONES: Record<GlossTone, { top: string; bottom: string; rim: string }> = {
  // L 0.995 → 0.925, rim 0.8, H 255
  pearl: { top: '#FCFDFF', bottom: '#E3E7EC', rim: '#B9BEC6' },
  // Tone on tone like the cards below, rather than fading to white.
  // L 0.93 → 0.87, C 0.035 → 0.055, rim 0.7, H 250
  blue: { top: '#D7EAFF', bottom: '#BAD8F8', rim: '#75A3D2' },
  // L 0.78 → 0.62, C 0.17 → 0.15, rim 0.5, H 150: the one saturated face,
  // for the primary action.
  green: { top: '#56D57B', bottom: '#2E9E52', rim: '#21763C' },
  // Correct and wrong are tone on tone: the same hue top to bottom, never
  // fading to white, which washes the top half out. They share one chroma; a
  // light red can't go as vivid as a light green, so red sits a touch darker
  // to reach it and the two read as equally strong.
  // L 0.9 → 0.83, C 0.085 → 0.095, rim 0.7, H 150
  correct: { top: '#B6EFC1', bottom: '#9AD9A7', rim: '#6FB07D' },
  // L 0.86 → 0.78, C 0.085 (clamped to sRGB) → 0.1, rim 0.65, H 22
  wrong: { top: '#FFBEBB', bottom: '#F19E9B', rim: '#CE6F6E' },
};

const INNER_EDGE = `inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -2px 4px ${ink(0.06)}`;

export const LAYER_STYLES = {
  ...(Object.fromEntries(
    Object.entries(TONES).map(([tone, { top, bottom, rim }]) => [
      tone,
      {
        borderColor: rim,
        experimental_backgroundImage: `linear-gradient(to bottom, ${top}, ${bottom})`,
        boxShadow: INNER_EDGE,
      },
    ]),
  ) as Record<GlossTone, ViewStyle>),
  // Tone-agnostic, laid over any face while it's held down.
  pressed: {
    borderColor: ink(0.12),
    experimental_backgroundImage: `linear-gradient(to bottom, ${ink(0.14)}, ${ink(0.04)})`,
    boxShadow: `inset 0 2px 5px ${ink(0.22)}`,
  },
} satisfies Record<GlossLayer, ViewStyle>;

// Secondary text is the ink at reduced alpha, like the shadows.
export const GLOSS_INK_SECONDARY = ink(0.68);

// Flat surfaces laid over the sky, like a sheet: the pearl face's top and rim.
export const GLOSS_SURFACE = TONES.pearl.top;
export const GLOSS_SURFACE_RIM = TONES.pearl.rim;

// The progress bar's groove and fill: too thin a shape for the gloss recipe
// above to read, so it stays flat. The fill reuses the confirm key's green.
export const GLOSS_PROGRESS_TRACK = ink(0.1);
export const GLOSS_PROGRESS_FILL = TONES.green.bottom;

export const GLOSS_DROP_SHADOW = `0 1px 2px ${ink(0.14)}, 0 4px 10px ${ink(0.08)}`;

// Soft, so it leaves a face's color intact instead of whitening the top half,
// and fades out completely: any alpha left at the lower edge draws a band.
export const HIGHLIGHT_GRADIENT = 'linear-gradient(to bottom, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0))';

// Dark text pressed into a light face: a white edge just below each glyph.
export const ENGRAVED_TEXT: TextStyle = {
  textShadowColor: 'rgba(255, 255, 255, 0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 0,
};

// White text raised off the green face, its shadow in the green rim's hue.
export const EMBOSSED_TEXT: TextStyle = {
  textShadowColor: 'rgba(33, 118, 60, 0.6)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
};
