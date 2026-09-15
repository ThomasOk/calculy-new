import type { SkCanvas } from '@shopify/react-native-skia';
import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Problem } from '@/features/challenge/problems';
import type { Hit } from '@/features/challenge/prototype-not-boring/answer-hit';
import type { NumberFeedback } from '@/features/challenge/prototype-not-boring/extruded-number';
import type { Row, RowMetrics, Segment } from '@/features/challenge/prototype-not-boring/problem-rows';
import type { GlyphRun, ReliefPaints } from '@/features/challenge/prototype-not-boring/relief';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { LeagueGothic_400Regular } from '@expo-google-fonts/league-gothic';
import { Canvas, createPicture, Picture, Skia, useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { clamp, Extrapolation, interpolate, useDerivedValue, useReducedMotion } from 'react-native-reanimated';
import { formatProblem } from '@/features/challenge/problems';
import {
  drawSparks,
  drawSweep,
  drawWindow,
  popScale,
  PRESS,
  STAMP_ENTER,
  STAMP_FADE_IN,
  useHit,
  usePress,
  useScroll,
} from '@/features/challenge/prototype-not-boring/answer-hit';
import { buildRows, measureRows, useRowShake } from '@/features/challenge/prototype-not-boring/problem-rows';
import {
  DEPTH,
  drawSides,
  drawWithAlpha,
  extrusion,
  faceShader,
  FONT_UNITS,
  usePaints,
} from '@/features/challenge/prototype-not-boring/relief';
import { useGlyphSlots } from '@/features/challenge/prototype-not-boring/use-glyph-slots';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// I's giant answer, with the calculations coming up a column instead of
// round an arc, and the game feel of answer-hit.ts. From the top: the
// previous calculation, small, with its answer in green or red; a card
// holding the current calculation, lit, above the giant answer being typed;
// the next calculation, small, below the card. Never more than these three,
// so the first calculation shows with only the next one below.
//
// On each answer the hit plays on the giant answer: its color sweeps across
// the card, and it flashes white, pops and throws sparks, or sinks and
// shakes. The column holds still for a few frames, then scrolls up one
// place: the answered calculation rises out of the card and its giant answer
// flies after it, shrinking into its place after the `=`, while the next
// calculation rises into the card. One canvas for all, so the answer that
// flies is the very one that stood on the card.

// The current calculation's size, in points per font unit, at most.
const CURRENT = 0.6;
// The previous and next calculations' size, relative to the current one.
const SIDE = 0.6;
// How many digits the giant answer must fit across.
const GIANT_CHARS = 4;
// Kept free at the screen's sides, in points.
const EDGE = 16;
// In points: between the card and the previous or next calculation; inside
// the card, around its content; between the calculation and the answer.
const GAP = 14;
const CARD_PAD = 12;
const INNER_GAP = 10;
// The card's inset from the screen's sides, in points.
const CARD_INSET = 8;
// A row fades out past the previous or the next place, gone at FADE_END
// places from the current one: three rows at rest. Short of 2, so the one
// coming in stays hidden while a correct answer's notch overshoots.
const FADE_END = 1.8;
// Rows built either side of the current one: one more than show, so the row
// leaving at the top is still there as the column scrolls.
const BUILT = 2;
// A typed digit comes down onto the card from this many times its size:
// less than in the reel, the answer being about three times as big.
const STAMP = 1.2;
// The sparks' width at the start, in points.
const SPARK_WIDTH = 4;

type Props = {
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  input: string;
  skin: Skin;
  tilt: SharedValue<Tilt>;
  // The answer just confirmed: its hit, and how the column scrolls.
  feedback?: NumberFeedback | null;
};

export function ProblemStack({ problems, answers, currentIndex, input, skin, tilt, feedback = null }: Props) {
  const font = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);
  const reducedMotion = useReducedMotion();

  // No `?`: the giant answer below the calculation is its answer.
  const rows = React.useMemo(
    () => (font ? buildRows(font, { problems, answers, currentIndex, hasInput: true, range: BUILT }) : []),
    [font, problems, answers, currentIndex],
  );
  const layout = React.useMemo(
    () => (font && size.width > 0 ? computeLayout(measureRows(font, problems), size) : null),
    [font, problems, size],
  );
  // Cleared at once on an answer: the answered row then draws the same
  // digits in the same place, and flies them up.
  const slots = useGlyphSlots(font, input, { align: 'center', resetKey: currentIndex, enter: STAMP_ENTER });
  const roll = useScroll(currentIndex, feedback);
  const press = usePress(input);
  const hit = useHit(feedback);
  const shake = useRowShake(feedback);
  const paints = usePaints(skin);
  const answered = currentIndex - 1;

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!layout)
        return;
      const position = roll.get();
      const style = { t: tilt.get(), skin, paints, layout, reducedMotion };

      canvas.save();
      canvas.translate(layout.width / 2, (layout.cardTop + layout.cardBottom) / 2);
      const frame = { width: layout.width - CARD_INSET * 2, height: layout.cardBottom - layout.cardTop };
      drawWindow(canvas, { ...frame, color: skin.ink });
      drawSweep(canvas, {
        ...frame,
        progress: hit.sweep.get(),
        color: hit.correct.get() ? skin.correct : skin.wrong,
        reducedMotion,
      });
      canvas.restore();

      for (const row of rows) {
        const place = rowPlace(row.index - position, layout);
        if (place.alpha < 0.01)
          continue;
        const isAnswered = row.index === answered;
        drawWithAlpha(canvas, place.alpha, () => drawStackRow(canvas, row, {
          ...style,
          place,
          landed: clamp(position - row.index, 0, 1),
          shakeX: isAnswered ? shake.get() : 0,
          hit: isAnswered ? { pop: hit.pop.get(), flash: hit.flash.get(), sparks: hit.sparks.get() } : null,
        }));
      }

      drawGiantInput(
        canvas,
        { paths: slots.paths.get(), widths: slots.widths.get(), xs: slots.xs.get(), vis: slots.vis.get() },
        { ...style, press: press.get() },
      );
    });
  }, [layout, rows, paints, skin, reducedMotion, answered]);

  const current = problems[currentIndex];
  return (
    <View
      style={styles.fill}
      onLayout={onLayout}
      accessible
      accessibilityRole="text"
      accessibilityLabel={current ? `${formatProblem(current)} ${input}` : undefined}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

type StackLayout = {
  width: number;
  // In font units: the digits' height, and a space.
  h: number;
  space: number;
  // The giant answer's width for the face's light (faceShader).
  span: number;
  // Points per font unit: the current calculation, the previous and next
  // ones, the giant answer.
  kc: number;
  ks: number;
  kg: number;
  // Centers, in points: the previous calculation, the current one, the giant
  // answer with its relief, the next calculation.
  prevY: number;
  calcY: number;
  giantY: number;
  nextY: number;
  // How far a row fading out beyond the previous or next place moves per
  // place, in points.
  step: number;
  cardTop: number;
  cardBottom: number;
};

// The current calculation as big as CURRENT or the widest one allows, the
// previous and next ones SIDE of that, and the giant answer as big as the
// rest of the height and GIANT_CHARS digits across allow. Whatever height is
// left over goes above and below.
function computeLayout(metrics: RowMetrics, size: { width: number; height: number }): StackLayout {
  const h = metrics.digitHeight;
  const kc = Math.min(CURRENT, (size.width - EDGE * 2) / metrics.maxLeft);
  const ks = kc * SIDE;
  const hc = h * kc;
  const hs = h * ks;
  const fixed = hs * 2 + GAP * 2 + CARD_PAD * 2 + hc + INNER_GAP;
  // The giant answer's digits, and their relief below them.
  const kg = Math.max(0, Math.min(
    (size.width - EDGE * 2) / (GIANT_CHARS * metrics.digitWidth + DEPTH * 3),
    (size.height - fixed) / (h + DEPTH),
  ));
  const giantHeight = (h + DEPTH) * kg;

  let y = (size.height - fixed - giantHeight) / 2;
  const prevY = y + hs / 2;
  y += hs + GAP;
  const cardTop = y;
  y += CARD_PAD;
  const calcY = y + hc / 2;
  y += hc + INNER_GAP;
  const giantY = y + giantHeight / 2;
  y += giantHeight + CARD_PAD;
  const cardBottom = y;
  y += GAP;
  return {
    width: size.width,
    h,
    space: metrics.space,
    span: GIANT_CHARS * metrics.digitWidth,
    kc,
    ks,
    kg,
    prevY,
    calcY,
    giantY,
    nextY: y + hs / 2,
    step: hs + GAP,
    cardTop,
    cardBottom,
  };
}

type Place = {
  // The row's center, in points.
  y: number;
  // Points per font unit.
  s: number;
  alpha: number;
  // 1 lights the numbers white: the current calculation.
  lit: number;
};

// The worklets below must stay in this order: a worklet captures the
// functions it calls when its definition runs (see problem-roll.tsx).

// A row `offset` places below the current one: up to the previous place,
// down to the next one, and beyond them as it fades.
function rowPlace(offset: number, layout: StackLayout): Place {
  'worklet';
  const { prevY, calcY, nextY, step } = layout;
  const y = offset <= -1
    ? prevY + (offset + 1) * step
    : offset <= 0
      ? calcY + (calcY - prevY) * offset
      : offset <= 1 ? calcY + (nextY - calcY) * offset : nextY + (offset - 1) * step;
  const near = clamp(1 - Math.abs(offset), 0, 1);
  return {
    y,
    s: layout.ks + (layout.kc - layout.ks) * near,
    alpha: interpolate(Math.abs(offset), [1, FADE_END], [1, 0], Extrapolation.CLAMP),
    lit: near,
  };
}

// Where a glyph stands in the giant answer, stamped down from STAMP times its
// size: v is 0 before it lands, 1 in place.
function placeStamp(canvas: SkCanvas, glyph: { x: number; width: number; v: number }, ctx: { h: number; still: boolean }) {
  'worklet';
  const s = ctx.still ? 1 : 1 + (STAMP - 1) * (1 - glyph.v);
  canvas.translate(glyph.x + glyph.width / 2, -ctx.h / 2);
  canvas.scale(s, s);
  canvas.translate(-glyph.width / 2, ctx.h / 2);
}

type Style = { t: Tilt; skin: Skin; paints: ReliefPaints; layout: StackLayout; reducedMotion: boolean };

// The giant answer being typed, in relief, each digit stamped in and pressed
// into the card as it lands. As drawGlyphRun in relief.ts: every shadow and
// glow first, then each digit's sides and face.
function drawGiantInput(canvas: SkCanvas, run: GlyphRun, ctx: Style & { press: number }) {
  'worklet';
  const { layout, paints } = ctx;
  const full = extrusion(ctx.t, DEPTH);
  const pressed = PRESS * ctx.press;
  const dx = full.dx * (1 - pressed);
  const dy = full.dy * (1 - pressed);
  const stamp = { h: layout.h, still: ctx.reducedMotion };
  canvas.save();
  canvas.translate(layout.width / 2, layout.giantY);
  canvas.scale(layout.kg, layout.kg);
  // Digits and relief centered together; pressed, the face moves towards the
  // back, which stays put.
  canvas.translate(-full.dx / 2 + full.dx * pressed, layout.h / 2 - full.dy / 2 + full.dy * pressed);
  const count = run.paths.length;
  const order: number[] = [];
  for (let n = 0; n < count; n++)
    order.push(dx < 0 ? count - 1 - n : n);

  for (const i of order) {
    const path = run.paths[i];
    const v = run.vis[i] ?? 0;
    if (!path || v < 0.01)
      continue;
    canvas.save();
    placeStamp(canvas, { x: run.xs[i] ?? 0, width: run.widths[i] ?? 0, v }, stamp);
    const alpha = Math.min(1, v * STAMP_FADE_IN);
    const glow = paints.glow;
    if (glow)
      drawWithAlpha(canvas, alpha, () => canvas.drawPath(path, glow));
    canvas.translate(dx * 1.4 + 2, dy * 1.4 + 6);
    drawWithAlpha(canvas, alpha, () => canvas.drawPath(path, paints.shadow));
    canvas.restore();
  }
  for (const i of order) {
    const path = run.paths[i];
    const v = run.vis[i] ?? 0;
    if (!path || v < 0.01)
      continue;
    const x = run.xs[i] ?? 0;
    const width = run.widths[i] ?? 0;
    canvas.save();
    placeStamp(canvas, { x, width, v }, stamp);
    drawWithAlpha(canvas, Math.min(1, v * STAMP_FADE_IN), () => {
      drawSides(canvas, path, { dx, dy, sides: paints.sides });
      const face = Skia.Paint();
      face.setAntiAlias(true);
      face.setShader(faceShader(ctx.skin, ctx.t, { x, width, digitHeight: layout.h, span: layout.span }));
      canvas.drawPath(path, face);
      canvas.drawPath(path, paints.edge);
    });
    canvas.restore();
  }
  canvas.restore();
}

type RowContext = Style & {
  place: Place;
  // 0 while the row's answer stands giant on the card, 1 once it has landed
  // after the `=`: how far the row has scrolled past the current place.
  landed: number;
  shakeX: number;
  // The answered row's hit.
  hit: Hit | null;
};

// One of the calculation's parts, flat: gray numbers, lit white in the
// current place, orange operator.
function drawCalcSegment(canvas: SkCanvas, segment: Segment, { skin, lit }: { skin: Skin; lit: number }) {
  'worklet';
  canvas.save();
  canvas.translate(segment.x, 0);
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(segment.role === 'operator' ? skin.accent : skin.muted));
  canvas.drawPath(segment.path, paint);
  if (segment.role === 'number' && lit > 0.01) {
    const white = Skia.Paint();
    white.setAntiAlias(true);
    white.setColor(Skia.Color(skin.ink));
    white.setAlphaf(lit);
    canvas.drawPath(segment.path, white);
  }
  canvas.restore();
}

// A row's answer, from the giant answer's place on the card (landed 0) to
// its place after the row's `=` (landed 1), following the row as it scrolls.
// It loses its relief on the way. Green or red from the start; the hit pops
// or sinks it, whitens a correct one and throws its sparks.
function drawFlyingAnswer(
  canvas: SkCanvas,
  segment: Segment,
  ctx: RowContext & { to: { x: number; y: number }; correct: boolean; seed: number },
) {
  'worklet';
  const { layout, landed: e, skin, paints, hit } = ctx;
  const giant = extrusion(ctx.t, DEPTH);
  const relief = extrusion(ctx.t, DEPTH * (1 - e));
  const fromX = layout.width / 2 + layout.kg * (-segment.width / 2 - giant.dx / 2) + ctx.shakeX;
  const fromY = layout.giantY + layout.kg * (layout.h / 2 - giant.dy / 2);
  const k = layout.kg + (ctx.place.s - layout.kg) * e;
  canvas.save();
  canvas.translate(fromX + (ctx.to.x - fromX) * e, fromY + (ctx.to.y - fromY) * e);
  canvas.scale(k, k);
  if (hit && ctx.correct && !ctx.reducedMotion) {
    drawSparks(
      canvas,
      { cx: segment.width / 2, cy: -layout.h / 2, rx: segment.width / 2, ry: layout.h / 2, digitHeight: layout.h },
      { progress: hit.sparks, seed: ctx.seed, color: skin.ink, width: SPARK_WIDTH / k },
    );
  }
  const grow = popScale(hit, ctx);
  canvas.translate(segment.width / 2, -layout.h / 2);
  canvas.scale(grow, grow);
  canvas.translate(-segment.width / 2, layout.h / 2);
  if (e < 0.98) {
    canvas.save();
    canvas.translate(relief.dx * 1.4 + 2, relief.dy * 1.4 + 6);
    drawWithAlpha(canvas, 1 - e, () => canvas.drawPath(segment.path, paints.shadow));
    canvas.restore();
    drawSides(canvas, segment.path, { dx: relief.dx, dy: relief.dy, sides: paints.sides });
  }
  const face = Skia.Paint();
  face.setAntiAlias(true);
  face.setColor(Skia.Color(ctx.correct ? skin.correct : skin.wrong));
  canvas.drawPath(segment.path, face);
  if (hit && ctx.correct && hit.flash > 0.01) {
    const white = Skia.Paint();
    white.setAntiAlias(true);
    white.setColor(Skia.Color(skin.ink));
    white.setAlphaf(hit.flash);
    canvas.drawPath(segment.path, white);
  }
  canvas.restore();
}

// One row: its calculation centered, with its answer as it lands, which
// shifts the calculation left to make room. After the worklets it calls: see
// the note above rowPlace.
function drawStackRow(canvas: SkCanvas, row: Row, ctx: RowContext) {
  'worklet';
  const { place, layout } = ctx;
  const answer = row.segments.find(segment => segment.role === 'answer');
  // The row's extent around its origin, the start of its answer.
  const left = -layout.space - row.leftWidth;
  const right = -layout.space + (answer ? ctx.landed * (layout.space + answer.width) : 0);
  const originX = layout.width / 2 - (place.s * (left + right)) / 2 + ctx.shakeX;
  const baseline = place.y + (place.s * layout.h) / 2;

  canvas.save();
  canvas.translate(originX, baseline);
  canvas.scale(place.s, place.s);
  for (const segment of row.segments) {
    if (segment.role !== 'answer')
      drawCalcSegment(canvas, segment, { skin: ctx.skin, lit: place.lit });
  }
  canvas.restore();

  if (answer) {
    drawFlyingAnswer(canvas, answer, {
      ...ctx,
      to: { x: originX, y: baseline },
      correct: row.correct !== false,
      seed: row.index,
    });
  }
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
