import type { CSSAnimationProperties, CSSTransitionProperties } from 'react-native-reanimated';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { LeagueGothic_400Regular, useFonts } from '@expo-google-fonts/league-gothic';
import { Platform } from 'react-native';
import { cubicBezier } from 'react-native-reanimated';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Pagaille's look, without Skia: its faces, the ink on its paint, its
// seeded mess, its plates' slant and the entrances of its menus
// (pagaille-menu.tsx). Safe to import where Skia can't load: the home
// screen, and its tests.

export const GOTHIC = { fontFamily: 'LeagueGothic_400Regular' } as const;
export const SERIF = { fontFamily: 'AbrilFatface_400Regular' } as const;
// Text on the paint.
export const ON_SPLASH = '#101010';
// The plates' slant.
export const SKEW = '-14deg';

// League Gothic's digits (count-box.tsx, pagaille-countdown.tsx): the font
// reserves room below them for descenders they don't have, so a digit
// centered by its full line height sits low, with a gap under it. Pulled up
// instead of shortening the line, which clips their tops on iOS. Android's
// own font metrics leave a smaller gap once includeFontPadding is off — a
// first guess (a Nothing Phone 2 showed the iOS value pulling too far, the
// bottom padding gone): confirm on device and adjust here if still off.
const DIGIT_DESCENDER = Platform.select({ android: 0.06, default: 0.14 });

// How far up League Gothic's digits, `size` points tall, need to be pulled
// to sit centered in a box shaped to their full line height: a negative
// marginBottom, in points.
export function digitRise(size: number) {
  return -size * DIGIT_DESCENDER;
}

// See challenge-countdown.tsx for the cast.
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1) as unknown as 'ease-out';
const EASE_OUT_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)';
// Pressed, a menu's plate goes down into its shadow this far, as the finger
// lands.
export const PRESS_DEPTH = 4;
export const PRESS_TRANSITION = {
  transition: `transform 100ms ${EASE_OUT_CSS}, opacity 100ms ${EASE_OUT_CSS}`,
} satisfies CSSTransitionProperties;
// Stamped down from STAMP_FROM times its size, at an even speed: an
// impact, like the typed digits.
const STAMP_FROM = 1.6;
export const STAMP_MS = 150;
// How far things slide or rise in from.
const SLIDE_FROM = 56;
const RISE_FROM = 16;

// Both of Pagaille's faces, for React Native text. Skia loads its own.
export function usePagailleFonts() {
  const [loaded] = useFonts({ LeagueGothic_400Regular, AbrilFatface_400Regular });
  return loaded;
}

// Between 0 and 1, the same for the same n.
export function noise(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Between -1 and 1, the same for the same n.
export function wobble(n: number) {
  return noise(n) * 2 - 1;
}

// The entrances, each `delay` ms from the mount. Build them once, at module
// level: a new keyframes object on a re-render could replay the entrance.

export function stampIn(delay: number) {
  return {
    animationName: {
      'from': { opacity: 0, transform: [{ scale: STAMP_FROM }] },
      '40%': { opacity: 1, transform: [{ scale: 1 + (STAMP_FROM - 1) * 0.6 }] },
      'to': { opacity: 1, transform: [{ scale: 1 }] },
    },
    animationDuration: `${STAMP_MS}ms`,
    animationDelay: `${delay}ms`,
    animationTimingFunction: 'linear',
    animationFillMode: 'backwards',
  } satisfies CSSAnimationProperties;
}

// From the right, like a menu's items; a negative `from`, from the left.
export function slideIn(delay: number, from = SLIDE_FROM) {
  return {
    animationName: {
      from: { opacity: 0, transform: [{ translateX: from }] },
      to: { opacity: 1, transform: [{ translateX: 0 }] },
    },
    animationDuration: '260ms',
    animationDelay: `${delay}ms`,
    animationTimingFunction: EASE_OUT,
    animationFillMode: 'backwards',
  } satisfies CSSAnimationProperties;
}

export function riseIn(delay: number) {
  return {
    animationName: {
      from: { opacity: 0, transform: [{ translateY: RISE_FROM }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    },
    animationDuration: '260ms',
    animationDelay: `${delay}ms`,
    animationTimingFunction: EASE_OUT,
    animationFillMode: 'backwards',
  } satisfies CSSAnimationProperties;
}

// A stamp, or its reduced-motion stand-in, to pass along to a component.
export type EntranceStyle = ReturnType<typeof stampIn> | ReturnType<typeof fadeIn>;

// Reduced motion's stand-in for all of the above.
export function fadeIn(delay: number) {
  return {
    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
    animationDuration: '200ms',
    animationDelay: `${delay}ms`,
    animationTimingFunction: EASE_OUT,
    animationFillMode: 'backwards',
  } satisfies CSSAnimationProperties;
}
