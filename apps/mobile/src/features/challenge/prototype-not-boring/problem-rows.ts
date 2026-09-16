import type { SkFont } from '@shopify/react-native-skia';
import type { NumberFeedback } from '@/features/challenge/prototype-not-boring/answer-hit';
import * as React from 'react';
import { useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Two bits Pagaille's calculations (problem-pagaille.tsx) share with the
// rest of the Not Boring bench: a font fallback for symbols Skia's font
// might lack, and the shake on a wrong answer's row.

// Symbols the font might lack: Skia has no fallback font.
const FALLBACKS: Record<string, string> = { '−': '-', '×': 'x' };
const SHAKE_STEP = { duration: 40 };

// Each character the font has, or its fallback.
export function fontText(font: SkFont, text: string) {
  return text
    .split('')
    .map(char => (font.getGlyphIDs(char)[0] ? char : FALLBACKS[char] ?? char))
    .join('');
}

// A wrong answer shakes the row that was just answered. In points.
export function useRowShake(feedback: NumberFeedback | null | undefined) {
  const reducedMotion = useReducedMotion();
  const shake = useSharedValue(0);
  React.useEffect(() => {
    if (!feedback || feedback.correct || reducedMotion)
      return;
    shake.set(withSequence(
      withTiming(-8, SHAKE_STEP),
      withTiming(8, SHAKE_STEP),
      withTiming(-5, SHAKE_STEP),
      withTiming(3, SHAKE_STEP),
      withTiming(0, SHAKE_STEP),
    ));
  }, [feedback, reducedMotion, shake]);
  return shake;
}
