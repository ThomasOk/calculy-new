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
// D's roll (problem-roll.tsx) tidied up, with the game feel of answer-hit.ts.
// The previous, current and next calculations, one above the other and
// aligned on their `=`; never more than these three, so the first
// calculation shows with only the next one below it. The current one is full
// size and in relief, its answer typed in place; the others smaller, flat
// and gray. A faint window marks the current one's place.

// The previous and next calculations' size, relative to the current one.
const SIDE = 0.6;
// Between the current row and the previous or next one, in the current
// row's digit heights: as much as the height allows between the two.
const GAP_MIN = 0.4;
const GAP_MAX = 0.7;
// A row fades out past the previous or the next place, gone at FADE_END
// places from the current one: three rows at rest. Short of 2, so the one
// coming in stays hidden while a correct answer's notch overshoots.
const FADE_END = 1.8;
// Rows built either side of the current one: one more than show, so the row
// leaving at the top is still there as the column scrolls.
const BUILT = 2;
// Kept free at the screen's sides, in points.
const EDGE = 16;
// The window behind the current row: its height in digit heights, and its
// inset from the screen's sides in points.
const WINDOW_HEIGHT = 1.5;
const WINDOW_INSET = 8;
// A typed digit comes down onto the row from this many times its size.
const STAMP = 1.35;
// The sparks' width at the start, in font units.
const SPARK_WIDTH = 5;

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

export function ProblemReel({ problems, answers, currentIndex, input, skin, tilt, feedback = null }: Props) {
  const font = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);
  const reducedMotion = useReducedMotion();

  const hasInput = input !== '';
  const rows = React.useMemo(
    () => (font ? buildRows(font, { problems, answers, currentIndex, hasInput, range: BUILT }) : []),
    [font, problems, answers, currentIndex, hasInput],
  );
  const metrics = React.useMemo(() => (font ? measureRows(font, problems) : null), [font, problems]);
  const layout = React.useMemo(
    () => (metrics && size.width > 0 ? computeLayout(metrics, size) : null),
    [metrics, size],
  );
  // The digits being typed, stamped in. Cleared at once on an answer: the
  // answered row then draws the same digits in the same place.
  const slots = useGlyphSlots(font, input, { align: 'left', resetKey: currentIndex, enter: STAMP_ENTER });
  const roll = useScroll(currentIndex, feedback);
  const press = usePress(input);
  const hit = useHit(feedback);
  const shake = useRowShake(feedback);
  const paints = usePaints(skin);
  const answered = currentIndex - 1;

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!layout || !metrics)
        return;
      const position = roll.get();
      const run: GlyphRun = {
        paths: slots.paths.get(),
        widths: slots.widths.get(),
        xs: slots.xs.get(),
        vis: slots.vis.get(),
      };
      const base = {
        t: tilt.get(),
        skin,
        paints,
        reducedMotion,
        digitHeight: metrics.digitHeight,
        span: metrics.maxLeft + metrics.maxInput,
      };

      canvas.translate(size.width / 2, size.height / 2);
      const frame = {
        width: size.width - WINDOW_INSET * 2,
        height: metrics.digitHeight * WINDOW_HEIGHT * layout.scale,
      };
      drawWindow(canvas, { ...frame, color: skin.ink });
      drawSweep(canvas, {
        ...frame,
        progress: hit.sweep.get(),
        color: hit.correct.get() ? skin.correct : skin.wrong,
        reducedMotion,
      });
      canvas.scale(layout.scale, layout.scale);
      for (const row of rows) {
        const place = rowPlace(row.index - position, layout.pitch);
        if (place.alpha < 0.01)
          continue;
        canvas.save();
        // Scaled about the end of its `=`, so the `=` stay in one column.
        const shakeX = row.index === answered ? shake.get() / layout.scale : 0;
        canvas.translate(layout.column - metrics.space + shakeX, place.y);
        canvas.scale(place.s, place.s);
        canvas.translate(metrics.space, metrics.digitHeight / 2);
        drawWithAlpha(canvas, place.alpha, () => drawReelRow(canvas, row, {
          ...base,
          active: place.active,
          press: row.index === currentIndex ? press.get() : 0,
          input: row.index === currentIndex ? run : null,
          hit: row.index === answered
            ? { pop: hit.pop.get(), flash: hit.flash.get(), sparks: hit.sparks.get() }
            : null,
        }));
        canvas.restore();
      }
    });
  }, [layout, metrics, size, rows, paints, skin, reducedMotion, currentIndex, answered]);

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

type ReelLayout = {
  // Points per font unit.
  scale: number;
  // From one row's center to the next, in font units.
  pitch: number;
  // Where the rows' `=` column stands, from the screen's center, in font units.
  column: number;
};

// As big as the widest row allows across, then the rows spread out as far as
// the height allows, within GAP_MIN and GAP_MAX.
function computeLayout(metrics: RowMetrics, size: { width: number; height: number }): ReelLayout {
  const h = metrics.digitHeight;
  const span = metrics.maxLeft + metrics.space + metrics.maxInput;
  const across = (size.width - EDGE * 2) / (span + DEPTH * 2);
  // Below the current row's center: half of it, the gap, the whole next row.
  const room = (size.height / across - DEPTH * 2) / 2 - h / 2 - SIDE * h;
  const gap = clamp(room / h, GAP_MIN, GAP_MAX) * h;
  const pitch = h / 2 + gap + (SIDE * h) / 2;
  const reach = pitch + (SIDE * h) / 2;
  return {
    scale: Math.min(across, size.height / (reach * 2 + DEPTH * 2)),
    pitch,
    // The widest possible row, from the longest calculation to the widest
    // answer, centered.
    column: (metrics.maxLeft + metrics.space - metrics.maxInput) / 2,
  };
}

type Place = {
  // The row's center, below the current place's, in font units.
  y: number;
  // 1 in the current place, SIDE in the previous or next one.
  s: number;
  alpha: number;
  // 1 in the current place, in relief; 0 a place away or more.
  active: number;
};

// The worklets below must stay in this order: a worklet captures the
// functions it calls when its definition runs (see problem-roll.tsx).

// A row `offset` places below the current one.
function rowPlace(offset: number, pitch: number): Place {
  'worklet';
  const active = clamp(1 - Math.abs(offset), 0, 1);
  return {
    y: offset * pitch,
    s: SIDE + (1 - SIDE) * active,
    alpha: interpolate(Math.abs(offset), [1, FADE_END], [1, 0], Extrapolation.CLAMP),
    active,
  };
}

type Relief = { dx: number; dy: number };

type RowContext = {
  // 1 for the current row, 0 for a flat one, in between while it scrolls.
  active: number;
  // The current row's thump, from 1 as a digit lands back to 0.
  press: number;
  // The answered row's hit.
  hit: Hit | null;
  // The current row's digits being typed.
  input: GlyphRun | null;
  t: Tilt;
  skin: Skin;
  paints: ReliefPaints;
  reducedMotion: boolean;
  digitHeight: number;
  span: number;
};

// The calculation: flat gray numbers, the numbers lit white as the row comes
// to the current place.
function drawNumber(canvas: SkCanvas, segment: Segment, ctx: RowContext) {
  'worklet';
  const { skin, active } = ctx;
  const flat = Skia.Paint();
  flat.setAntiAlias(true);
  flat.setColor(Skia.Color(segment.role === 'operator' ? skin.accent : skin.muted));
  canvas.drawPath(segment.path, flat);
  if (segment.role !== 'number' || active < 0.01)
    return;
  const lit = Skia.Paint();
  lit.setAntiAlias(true);
  lit.setShader(faceShader(skin, ctx.t, {
    x: segment.x,
    width: segment.width,
    digitHeight: ctx.digitHeight,
    span: ctx.span,
  }));
  lit.setAlphaf(active);
  canvas.drawPath(segment.path, lit);
  const edge = ctx.paints.edge.copy();
  edge.setAlphaf(active);
  canvas.drawPath(segment.path, edge);
}

// The answer, green or red from the first frame, in relief while current.
// The hit scales it around its center, and whitens a correct one.
function drawAnswer(canvas: SkCanvas, segment: Segment, ctx: RowContext & { relief: Relief; correct: boolean }) {
  'worklet';
  const { hit, digitHeight, skin } = ctx;
  const grow = popScale(hit, ctx);
  canvas.save();
  canvas.translate(segment.x + segment.width / 2, -digitHeight / 2);
  canvas.scale(grow, grow);
  canvas.translate(-segment.width / 2, digitHeight / 2);
  if (ctx.active > 0.02)
    drawSides(canvas, segment.path, { dx: ctx.relief.dx, dy: ctx.relief.dy, sides: ctx.paints.sides });
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

// The digits being typed, each stamped down from STAMP times its size.
function drawInput(canvas: SkCanvas, ctx: RowContext, relief: Relief) {
  'worklet';
  const run = ctx.input;
  if (!run)
    return;
  const count = run.paths.length;
  for (let n = 0; n < count; n++) {
    const i = relief.dx < 0 ? count - 1 - n : n;
    const path = run.paths[i];
    const v = run.vis[i] ?? 0;
    if (!path || v < 0.01)
      continue;
    const x = run.xs[i] ?? 0;
    const width = run.widths[i] ?? 0;
    const s = ctx.reducedMotion ? 1 : 1 + (STAMP - 1) * (1 - v);
    canvas.save();
    canvas.translate(x + width / 2, -ctx.digitHeight / 2);
    canvas.scale(s, s);
    canvas.translate(-width / 2, ctx.digitHeight / 2);
    drawWithAlpha(canvas, Math.min(1, v * STAMP_FADE_IN), () => {
      if (ctx.active > 0.02)
        drawSides(canvas, path, { dx: relief.dx, dy: relief.dy, sides: ctx.paints.sides });
      const face = Skia.Paint();
      face.setAntiAlias(true);
      face.setShader(faceShader(ctx.skin, ctx.t, { x, width, digitHeight: ctx.digitHeight, span: ctx.span }));
      canvas.drawPath(path, face);
      canvas.drawPath(path, ctx.paints.edge);
    });
    canvas.restore();
  }
}

// One row, from its `=` column at x = 0 and its baseline, in font units.
// After the worklets it calls: see the note above rowPlace.
function drawReelRow(canvas: SkCanvas, row: Row, ctx: RowContext) {
  'worklet';
  const full = extrusion(ctx.t, DEPTH * ctx.active);
  // Pressed into the page: the face moves towards the back, which stays put.
  const pressed = PRESS * ctx.press;
  canvas.translate(full.dx * pressed, full.dy * pressed);
  const relief = { dx: full.dx * (1 - pressed), dy: full.dy * (1 - pressed) };
  const raised = ctx.active > 0.02;

  // Shadows first: they sit behind the whole row.
  if (raised) {
    for (const segment of row.segments) {
      if (segment.role === 'placeholder')
        continue;
      canvas.save();
      canvas.translate(segment.x + relief.dx * 1.4 + 2, relief.dy * 1.4 + 6);
      drawWithAlpha(canvas, ctx.active, () => canvas.drawPath(segment.path, ctx.paints.shadow));
      canvas.restore();
    }
  }

  // Painter's order, as in relief.ts: right to left when the sides go left.
  // The typed digits are the rightmost shapes of the row.
  const segments = relief.dx < 0 ? row.segments.slice().reverse() : row.segments;
  if (relief.dx < 0)
    drawInput(canvas, ctx, relief);
  for (const segment of segments) {
    if (segment.role === 'answer') {
      drawAnswer(canvas, segment, { ...ctx, relief, correct: row.correct !== false });
      continue;
    }
    canvas.save();
    canvas.translate(segment.x, 0);
    if (raised && segment.role !== 'placeholder')
      drawSides(canvas, segment.path, { dx: relief.dx, dy: relief.dy, sides: ctx.paints.sides });
    drawNumber(canvas, segment, ctx);
    canvas.restore();
  }
  if (relief.dx >= 0)
    drawInput(canvas, ctx, relief);

  const answer = row.segments.find(segment => segment.role === 'answer');
  if (answer && ctx.hit && row.correct && !ctx.reducedMotion) {
    const h = ctx.digitHeight;
    drawSparks(
      canvas,
      { cx: answer.x + answer.width / 2, cy: -h / 2, rx: answer.width / 2, ry: h / 2, digitHeight: h },
      { progress: ctx.hit.sparks, seed: row.index, color: ctx.skin.ink, width: SPARK_WIDTH },
    );
  }
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
