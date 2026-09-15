import type { SkFont, SkPath } from '@shopify/react-native-skia';
import type { Problem } from '@/features/challenge/problems';
import type { NumberFeedback } from '@/features/challenge/prototype-not-boring/extruded-number';
import { Skia } from '@shopify/react-native-skia';
import * as React from 'react';
import { Easing, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { formatProblem } from '@/features/challenge/problems';
import { measure, textWidth } from '@/features/challenge/prototype-not-boring/relief';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Calculations as Skia outlines, shared by the roll (problem-roll.tsx) and
// the band (problem-band.tsx). Each row is aligned on the start of its
// answer, at x = 0: the calculation ends a space before it and the answer
// grows to the right, like sums written in a column.

// Rows kept either side of the current one. The second one out is invisible,
// so rows fade in and out at the edges instead of popping.
export const RANGE = 2;
// Symbols the font might lack: Skia has no fallback font.
const FALLBACKS: Record<string, string> = { '−': '-', '×': 'x' };
// The widest answer the keypad allows (use-challenge.ts).
const WIDEST_INPUT = '8888';
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SHAKE_STEP = { duration: 40 };

export type Role = 'number' | 'operator' | 'equals' | 'answer' | 'placeholder';
export type Segment = { path: SkPath; x: number; width: number; role: Role };
export type Row = {
  index: number;
  segments: Segment[];
  // Width of the calculation, `=` included, left of the answer.
  leftWidth: number;
  correct: boolean | null;
};

// Each character the font has, or its fallback.
export function fontText(font: SkFont, text: string) {
  return text
    .split('')
    .map(char => (font.getGlyphIDs(char)[0] ? char : FALLBACKS[char] ?? char))
    .join('');
}

// Sized for the whole run, so rows never change size mid-run.
export function measureRows(font: SkFont, problems: Problem[]) {
  return {
    ...measure(font),
    space: textWidth(font, ' '),
    maxLeft: Math.max(0, ...problems.map(problem => textWidth(font, fontText(font, formatProblem(problem))))),
    // The widest correct answer of the run.
    maxAnswer: Math.max(textWidth(font, '?'), ...problems.map(problem => textWidth(font, String(problem.answer)))),
    maxInput: textWidth(font, WIDEST_INPUT),
  };
}

export type RowMetrics = ReturnType<typeof measureRows>;

type RowsInput = {
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  // Hides the current row's `?` once something is typed.
  hasInput: boolean;
  // Rows kept either side of the current one: RANGE by default.
  range?: number;
};

// The rows within `range` of the current one.
export function buildRows(font: SkFont, { problems, answers, currentIndex, hasInput, range = RANGE }: RowsInput): Row[] {
  const space = textWidth(font, ' ');
  const rows: Row[] = [];
  const first = Math.max(0, currentIndex - range);
  const last = Math.min(problems.length - 1, currentIndex + range);
  for (let index = first; index <= last; index++) {
    const problem = problems[index]!;
    const [left = '', operator = '', right = ''] = formatProblem(problem).split(' ');
    const parts: [string, Role][] = [
      [left, 'number'],
      [fontText(font, ` ${operator} `), 'operator'],
      [right, 'number'],
      [' =', 'equals'],
    ];
    const leftWidth = parts.reduce((sum, [text]) => sum + textWidth(font, text), 0);
    let x = -space - leftWidth;
    const segments: Segment[] = [];
    for (const [text, role] of parts) {
      const width = textWidth(font, text);
      const path = Skia.Path.MakeFromText(text, 0, 0, font);
      if (path)
        segments.push({ path, x, width, role });
      x += width;
    }

    const answer = answers[index];
    const tail = answer !== undefined
      ? { text: String(answer), role: 'answer' as const }
      : index === currentIndex && !hasInput ? { text: '?', role: 'placeholder' as const } : null;
    const tailPath = tail && Skia.Path.MakeFromText(tail.text, 0, 0, font);
    if (tail && tailPath)
      segments.push({ path: tailPath, x: 0, width: textWidth(font, tail.text), role: tail.role });

    rows.push({ index, segments, leftWidth, correct: answer === undefined ? null : answer === problem.answer });
  }
  return rows;
}

// The rows' position: currentIndex at rest, turning one notch per answer.
export function useRoll(currentIndex: number, durationMs: number) {
  const reducedMotion = useReducedMotion();
  const roll = useSharedValue(currentIndex);
  React.useEffect(() => {
    // Reduced motion: the rows jump to their places.
    roll.set(reducedMotion ? currentIndex : withTiming(currentIndex, { duration: durationMs, easing: EASE_OUT }));
  }, [currentIndex, durationMs, reducedMotion, roll]);
  return roll;
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
