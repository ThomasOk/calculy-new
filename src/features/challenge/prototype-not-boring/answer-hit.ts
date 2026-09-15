import type { SkCanvas } from '@shopify/react-native-skia';
import type { WithSpringConfig } from 'react-native-reanimated';
import type { NumberFeedback } from '@/features/challenge/prototype-not-boring/extruded-number';
import { ClipOp, PaintStyle, Skia, StrokeCap, TileMode } from '@shopify/react-native-skia';
import * as React from 'react';
import {
  Easing,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// The game feel shared by the column of calculations (problem-reel.tsx) and
// the column over the giant answer (problem-stack.tsx), after
// notbor.ing/words/the-most-satisfying-checkbox: every action gets several
// responses at once, in the same frame as its sound and haptic.
// - A digit is stamped: it comes down onto the page from above, bigger, and
//   lands with a thump that presses it into the page (usePress).
// - An answer is a hit (useHit). It shows its green or red at once, and that
//   color sweeps across the window (drawSweep). A correct answer flashes
//   white, pops and throws sparks (drawSparks); a wrong one sinks and shakes.
// - The column holds still for a few frames (hitstop), then scrolls one
//   place (useScroll): a springy notch for a correct answer, a dead stop for
//   a wrong one. The run starts with the calculations scrolling into place.
// Reduced motion keeps the colors and the flash, and drops the rest.

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// The window marking the current calculation's place: its corners, in
// points, and its opacity.
const WINDOW_RADIUS = 18;
const WINDOW_ALPHA = 0.05;
// On an answer, its green or red crosses the window, behind the calculation:
// a band SWEEP_BAND of the window's width, soft at both ends, from beyond
// the left edge to beyond the right one. It starts fast, on the answer's
// frame, and slows as it leaves. The window takes a faint tint of the color
// at once, fading as the band goes.
const SWEEP_MS = 320;
const SWEEP_BAND = 0.6;
const SWEEP_ALPHA = 0.5;
const SWEEP_TINT = 0.14;
// Reduced motion: no band, the window's tint alone, stronger.
const SWEEP_STILL_TINT = 0.3;

// A digit comes down onto the page at an even speed (an impact, not a
// settle), visible from its first frames: its glyph slots take STAMP_ENTER.
// On landing, it's pressed PRESS of its depth into the page, and comes back
// up.
const STAMP_MS = 90;
export const STAMP_ENTER = { duration: STAMP_MS, easing: Easing.linear };
export const STAMP_FADE_IN = 3;
export const PRESS = 0.45;
const PRESS_BACK = { duration: 160, easing: EASE_OUT };

// The column holds still this long after an answer, the answer popped and
// lit: the hit reads, then the column goes. Skipped if it's still scrolling
// from the last answer, so quick answers don't stutter.
const HITSTOP_MS = 50;
const TURN_BUSY_MS = HITSTOP_MS + 200;
// A correct answer grows this much, a wrong one shrinks this much, at once;
// then they settle.
const POP = 0.18;
const SINK = 0.1;
const POP_BACK = { duration: 240, easing: EASE_OUT };
// A correct answer's face is white through the hitstop, then fades to green.
const FLASH_OUT = { duration: 160, easing: EASE_OUT };
// A correct answer throws SPARKS short lines, from SPARK_GAP digit heights
// beyond its edge to SPARK_TRAVEL further, shrinking as they go.
const SPARKS = 9;
const SPARK_MS = 260;
const SPARK_GAP = 0.14;
const SPARK_TRAVEL = 0.55;
const SPARK_LENGTH = 0.32;
// One place per answer, perceptual durations (Reanimated plays springs 1.5
// times longer, the tail settling). A correct answer overshoots its place by
// about a tenth of a row and springs back into it; a wrong one lands dead.
const TURN_CORRECT: WithSpringConfig = { duration: 220, dampingRatio: 0.6 };
const TURN_WRONG: WithSpringConfig = { duration: 240, dampingRatio: 1 };
// The column starts this many places back and scrolls to the first
// calculation.
const SPIN_FROM = 2;
const SPIN: WithSpringConfig = { duration: 400, dampingRatio: 0.75 };

// The answer's hit, as its worklets read it.
export type Hit = { pop: number; flash: number; sparks: number };
// The window's size, in points.
export type Frame = { width: number; height: number };
// Around an answer, in its canvas's units: its center, half its width and
// height, and its digit height.
export type SparkBox = { cx: number; cy: number; rx: number; ry: number; digitHeight: number };

// The worklets below must stay in this order: a worklet captures the
// functions it calls when its definition runs (see problem-roll.tsx).

// The window's rounded rectangle, centered on the canvas's origin.
function windowShape({ width, height }: Frame) {
  'worklet';
  return Skia.RRectXY(Skia.XYWHRect(-width / 2, -height / 2, width, height), WINDOW_RADIUS, WINDOW_RADIUS);
}

// Where the current calculation stands, whatever scrolls: the eye knows
// where to look. Centered on the canvas's origin.
export function drawWindow(canvas: SkCanvas, frame: Frame & { color: string }) {
  'worklet';
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(frame.color));
  paint.setAlphaf(WINDOW_ALPHA);
  canvas.drawRRect(windowShape(frame), paint);
}

// An answer's green or red crossing the window. progress runs from 0, the
// band's head at the left edge, to 1, the whole band past the right one.
export function drawSweep(canvas: SkCanvas, sweep: Frame & { progress: number; color: string; reducedMotion: boolean }) {
  'worklet';
  const { width, height, progress } = sweep;
  if (progress >= 0.999)
    return;
  const shape = windowShape(sweep);
  const solid = Skia.Color(sweep.color);
  canvas.save();
  canvas.clipRRect(shape, ClipOp.Intersect, true);

  const tint = Skia.Paint();
  tint.setAntiAlias(true);
  tint.setColor(solid);
  tint.setAlphaf((sweep.reducedMotion ? SWEEP_STILL_TINT : SWEEP_TINT) * (1 - progress));
  canvas.drawRRect(shape, tint);

  if (!sweep.reducedMotion) {
    const clear = solid.slice();
    clear[3] = 0;
    const band = width * SWEEP_BAND;
    const head = -width / 2 + (width + band) * progress;
    const paint = Skia.Paint();
    // Faint far behind, brightest just behind the head, soft at the head.
    paint.setShader(Skia.Shader.MakeLinearGradient(
      { x: head - band, y: 0 },
      { x: head, y: 0 },
      [clear, solid, clear],
      [0, 0.8, 1],
      TileMode.Decal,
    ));
    paint.setAlphaf(SWEEP_ALPHA);
    canvas.drawRect(Skia.XYWHRect(-width / 2, -height / 2, width, height), paint);
  }
  canvas.restore();
}

// The answer's scale from its hit: up for a correct one, down for a wrong one.
export function popScale(hit: Hit | null, { correct, reducedMotion }: { correct: boolean; reducedMotion: boolean }) {
  'worklet';
  if (!hit || reducedMotion)
    return 1;
  return correct ? 1 + POP * hit.pop : 1 - SINK * hit.pop;
}

// Between 0 and 1, the same for the same n: sparks irregular, but steady from
// one frame to the next.
function noise(n: number) {
  'worklet';
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Short lines flying out of the answer, like a hit spark in a game. progress
// runs from 0 to 1; seed changes their layout from one answer to the next;
// width is the lines' width at the start, in the canvas's units.
export function drawSparks(
  canvas: SkCanvas,
  box: SparkBox,
  spark: { progress: number; seed: number; color: string; width: number },
) {
  'worklet';
  const q = spark.progress;
  if (q >= 0.99)
    return;
  const h = box.digitHeight;
  const rx = box.rx * (1 + POP) + SPARK_GAP * h;
  const ry = box.ry * (1 + POP) + SPARK_GAP * h;
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeWidth(spark.width * (1 - q));
  paint.setColor(Skia.Color(spark.color));
  paint.setAlphaf(1 - q * q);
  for (let i = 0; i < SPARKS; i++) {
    const angle = ((i + noise(i + spark.seed * 7)) / SPARKS) * Math.PI * 2;
    const reach = 0.6 + 0.8 * noise(i * 3 + spark.seed);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const from = SPARK_TRAVEL * h * reach * q;
    const to = from + SPARK_LENGTH * h * reach * (1 - q);
    const x = box.cx + rx * cos;
    const y = box.cy + ry * sin;
    canvas.drawLine(x + cos * from, y + sin * from, x + cos * to, y + sin * to, paint);
  }
}

// The column's position: currentIndex at rest. It scrolls to the first
// calculation, then one place per answer, after the hitstop.
export function useScroll(currentIndex: number, feedback: NumberFeedback | null) {
  const reducedMotion = useReducedMotion();
  const roll = useSharedValue(reducedMotion ? currentIndex : currentIndex - SPIN_FROM);
  const lastIndex = React.useRef<number | null>(null);
  const lastTurnAt = React.useRef(0);
  React.useEffect(() => {
    if (lastIndex.current === currentIndex)
      return;
    const first = lastIndex.current === null;
    lastIndex.current = currentIndex;
    // Reduced motion: the rows jump to their places.
    if (reducedMotion) {
      roll.set(currentIndex);
      return;
    }
    if (first) {
      roll.set(withSpring(currentIndex, SPIN));
      return;
    }
    const now = Date.now();
    const busy = now - lastTurnAt.current < TURN_BUSY_MS;
    lastTurnAt.current = now;
    // The answer that scrolls the column renders with it: see onConfirm.
    const turn = withSpring(currentIndex, feedback?.correct === false ? TURN_WRONG : TURN_CORRECT);
    roll.set(busy ? turn : withDelay(HITSTOP_MS, turn));
  }, [currentIndex, feedback, reducedMotion, roll]);
  return roll;
}

// The thump as each typed digit lands, from 1 back to 0. Not on erase.
export function usePress(input: string) {
  const reducedMotion = useReducedMotion();
  const press = useSharedValue(0);
  const lastLength = React.useRef(input.length);
  React.useEffect(() => {
    const grew = input.length > lastLength.current;
    lastLength.current = input.length;
    if (!grew || reducedMotion)
      return;
    press.set(withDelay(STAMP_MS, withSequence(withTiming(1, { duration: 0 }), withTiming(0, PRESS_BACK))));
  }, [input, reducedMotion, press]);
  return press;
}

// The answer's hit, on each new feedback: all at once on the first frame,
// held through the hitstop, then settling.
export function useHit(feedback: NumberFeedback | null) {
  const reducedMotion = useReducedMotion();
  const pop = useSharedValue(0);
  const flash = useSharedValue(0);
  const sparks = useSharedValue(1);
  const sweep = useSharedValue(1);
  const correct = useSharedValue(true);
  React.useEffect(() => {
    if (!feedback)
      return;
    // On the answer's frame, not after the hitstop: it's the verdict.
    correct.set(feedback.correct);
    sweep.set(withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: SWEEP_MS, easing: EASE_OUT }),
    ));
    const hold = (settle: typeof POP_BACK) =>
      withSequence(withTiming(1, { duration: 0 }), withDelay(HITSTOP_MS, withTiming(0, settle)));
    // Reduced motion keeps the flash: it's light, not movement.
    flash.set(feedback.correct ? hold(FLASH_OUT) : 0);
    if (reducedMotion)
      return;
    pop.set(hold(POP_BACK));
    if (feedback.correct) {
      sparks.set(withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: SPARK_MS, easing: EASE_OUT }),
      ));
    }
  }, [feedback, reducedMotion, pop, flash, sparks, sweep, correct]);
  return { pop, flash, sparks, sweep, correct };
}
