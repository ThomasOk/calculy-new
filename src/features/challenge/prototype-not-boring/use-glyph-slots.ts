import type { SkFont, SkPath } from '@shopify/react-native-skia';
import type { WithTimingConfig } from 'react-native-reanimated';
import { Skia } from '@shopify/react-native-skia';
import * as React from 'react';
import { Easing, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import { textWidth } from '@/features/challenge/prototype-not-boring/relief';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.

export const MAX_SLOTS = 6;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// Fires on every key press: 150ms, ease-out, no bounce — there's no finger
// momentum to carry.
const ENTER = { duration: 150, easing: EASE_OUT };
// The glyphs cleared by a reset, flying off to wherever the caller draws
// them. Once per answer: over before the next digit lands.
const DEPART = { duration: 220, easing: EASE_OUT };

// The glyphs a reset cleared, where they stood, and the key they belonged to.
export type DepartedGlyphs = {
  key: number;
  count: number;
  paths: (SkPath | null)[];
  xs: number[];
  widths: number[];
};

type Options = {
  // `center` keeps the text centered on 0 as it grows; `left` starts it at 0.
  align: 'center' | 'left';
  // A new key clears every slot at once instead of animating the digits out:
  // for when something else takes over drawing them. The cleared glyphs are
  // kept in `departed`, and `departure` runs from 0 to 1 for their exit.
  resetKey?: number;
  // How a character comes in and goes out, and the others slide: ENTER by
  // default.
  enter?: WithTimingConfig;
};

// MAX_SLOTS fixed places for the characters of `value`, left to right, laid
// out on the UI thread. A slot keeps its last outline after its character is
// removed, so the character can animate out. A new character drops in, and
// the others slide to make room.
export function useGlyphSlots(font: SkFont | null, value: string, { align, resetKey = 0, enter = ENTER }: Options) {
  const reducedMotion = useReducedMotion();
  const chars = useSharedValue<string[]>([]);
  const lastKey = useSharedValue(resetKey);
  const paths = useSharedValue<(SkPath | null)[]>(Array.from({ length: MAX_SLOTS }, () => null));
  const widths = useSharedValue<number[]>(Array.from({ length: MAX_SLOTS }, () => 0));
  const targets = useSharedValue<number[]>(Array.from({ length: MAX_SLOTS }, () => 0));
  const xs = useSharedValue<number[]>(Array.from({ length: MAX_SLOTS }, () => 0));
  const vis = useSharedValue<number[]>(Array.from({ length: MAX_SLOTS }, () => 0));
  const departed = useSharedValue<DepartedGlyphs>({ key: -1, count: 0, paths: [], xs: [], widths: [] });
  const departure = useSharedValue(1);

  React.useEffect(() => {
    if (!font)
      return;
    scheduleOnUI((text: string, key: number) => {
      'worklet';
      const previousKey = lastKey.get();
      const reset = key !== previousKey;
      lastKey.set(key);
      if (reset) {
        const count = chars.get().length;
        departed.set({
          key: previousKey,
          count,
          paths: paths.get().slice(0, count),
          xs: xs.get().slice(0, count),
          widths: widths.get().slice(0, count),
        });
        // Reduced motion: no flight, the glyphs are handed over at once.
        departure.set(0);
        departure.set(reducedMotion ? 1 : withTiming(1, DEPART));
      }

      const next = text.split('').slice(0, MAX_SLOTS);
      const previous = reset ? [] : chars.get();
      const nextPaths = paths.get().slice();
      const nextWidths = widths.get().slice();
      const nextTargets = targets.get().slice();
      // Where each slot is right now, animations included.
      const from = xs.get().slice();
      const fromVis = reset ? from.map(() => 0) : vis.get().slice();

      for (let i = 0; i < next.length; i++)
        nextWidths[i] = textWidth(font, next[i]!);
      const total = next.reduce((sum, _, i) => sum + (nextWidths[i] ?? 0), 0);
      let x = align === 'center' ? -total / 2 : 0;
      for (let i = 0; i < next.length; i++) {
        nextTargets[i] = x;
        if (previous[i] !== next[i]) {
          // A new character starts in its place, invisible, and drops in.
          nextPaths[i] = Skia.Path.MakeFromText(next[i]!, 0, 0, font);
          from[i] = x;
          fromVis[i] = 0;
        }
        x += nextWidths[i] ?? 0;
      }

      chars.set(next);
      paths.set(nextPaths);
      widths.set(nextWidths);
      targets.set(nextTargets);
      xs.set(from);
      vis.set(fromVis);
      xs.set(withTiming(nextTargets, enter));
      vis.set(withTiming(nextPaths.map((_, i) => (i < next.length ? 1 : 0)), enter));
    }, value, resetKey);
  }, [font, value, resetKey, align, enter, reducedMotion, chars, lastKey, paths, widths, targets, xs, vis, departed, departure]);

  return { paths, widths, xs, vis, departed, departure };
}

export type GlyphSlots = ReturnType<typeof useGlyphSlots>;
