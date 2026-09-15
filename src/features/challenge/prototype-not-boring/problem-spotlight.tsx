import type { SkCanvas } from '@shopify/react-native-skia';
import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Problem } from '@/features/challenge/problems';
import type { Role, Row, RowMetrics, Segment } from '@/features/challenge/prototype-not-boring/problem-rows';
import type { ReliefPaints } from '@/features/challenge/prototype-not-boring/relief';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { LeagueGothic_400Regular } from '@expo-google-fonts/league-gothic';
import { Canvas, createPicture, Picture, Skia, useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { clamp, useDerivedValue } from 'react-native-reanimated';
import { formatProblem } from '@/features/challenge/problems';
import { buildRows, measureRows, RANGE, useRoll } from '@/features/challenge/prototype-not-boring/problem-rows';
import {
  DEPTH,
  drawSides,
  drawWithAlpha,
  extrusion,
  faceShader,
  FONT_UNITS,
  usePaints,
} from '@/features/challenge/prototype-not-boring/relief';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// I's calculations above the giant answer, laid flat on one line as in G:
// the previous calculation on the left with its answer, the current one in
// the middle, the next one on the right, all upright and readable. The
// current one stands out more than in G or I: it's in relief, lit by the
// tilt like the giant number, while the others lie flat and gray. On each
// answer the line slides one place left: the answered calculation sinks
// into the page as it leaves the middle, and the next one rises out of it
// as it comes in. Everything follows from the roll's position, so a quick
// answer interrupts the slide cleanly.

// The current calculation's size, in points per font unit: I's 52pt.
const CURRENT = 0.52;
// The previous and next calculations' size, relative to the current one.
const SIDE = 0.6;
// Between two calculations at their widest, in points.
const GAP = 20;
// Kept free at the screen's edge.
const EDGE = 12;
const PAD_TOP = 8;
// Room below the current calculation for its sides and shadow.
const PAD_BOTTOM = 22;
// One place per answer, as the arc (problem-queue.tsx).
const TURN_MS = 220;

type SpotlightLayout = {
  width: number;
  // Points per font unit for the current calculation.
  k: number;
  baselineY: number;
  // In font units: a calculation ends a space before its answer.
  space: number;
  // From the current calculation's center to the next one's, and to the
  // previous one's, whose answer takes more room. In points.
  pitchAhead: number;
  pitchBack: number;
  // In font units, for the face's light.
  digitHeight: number;
  span: number;
};

type Props = {
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  skin: Skin;
  tilt: SharedValue<Tilt>;
};

export function ProblemSpotlight({ problems, answers, currentIndex, skin, tilt }: Props) {
  const font = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [width, setWidth] = React.useState(0);
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const metrics = React.useMemo(() => (font ? measureRows(font, problems) : null), [font, problems]);
  // Known before the font loads, so the giant number below doesn't jump.
  const height = PAD_TOP + (metrics?.digitHeight ?? FONT_UNITS * 0.75) * CURRENT + PAD_BOTTOM;
  const layout = React.useMemo(
    () => (metrics && width > 0 ? computeLayout(metrics, { width, height }) : null),
    [metrics, width, height],
  );
  // No `?` on the current calculation: the giant number below is its answer.
  const rows = React.useMemo(
    () => (font ? buildRows(font, { problems, answers, currentIndex, hasInput: true }) : []),
    [font, problems, answers, currentIndex],
  );
  const roll = useRoll(currentIndex, TURN_MS);
  const paints = usePaints(skin);

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!layout)
        return;
      const position = roll.get();
      const t = tilt.get();
      for (const row of rows)
        drawRow(canvas, row, { layout, skin, paints, t, offset: row.index - position });
    });
  }, [layout, rows, skin, paints]);

  const label = [problems[currentIndex], problems[currentIndex + 1]]
    .filter(problem => problem !== undefined)
    .map(problem => formatProblem(problem))
    .join(', ');
  return (
    <View style={{ height }} onLayout={onLayout} accessible accessibilityRole="text" accessibilityLabel={label}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

function computeLayout(metrics: RowMetrics, size: { width: number; height: number }): SpotlightLayout {
  // The widest calculation in the middle, and the previous one whole on its
  // left with the widest answer.
  const answerRoom = (metrics.space + metrics.maxAnswer) * SIDE;
  const fit = (size.width / 2 - GAP - EDGE) / (metrics.maxLeft * (0.5 + SIDE) + answerRoom);
  const k = Math.min(CURRENT, fit);
  const halves = (metrics.maxLeft / 2) * k * (1 + SIDE);
  return {
    width: size.width,
    k,
    baselineY: size.height - PAD_BOTTOM,
    space: metrics.space,
    pitchAhead: halves + GAP,
    pitchBack: halves + answerRoom * k + GAP,
    digitHeight: metrics.digitHeight,
    span: metrics.maxLeft,
  };
}

type RowContext = {
  layout: SpotlightLayout;
  skin: Skin;
  paints: ReliefPaints;
  t: Tilt;
  offset: number;
};

type SegmentStyle = RowContext & {
  // 1 in the middle: in relief and lit. 0 flat.
  active: number;
  // The segment's own fade: the answer and its `=` show as the calculation
  // leaves the middle.
  alpha: number;
  correct: boolean | null;
  dx: number;
  dy: number;
};

// The worklets below must stay in this order: a worklet captures the
// functions it calls when its definition runs. See problem-roll.tsx.

// Flat gray first, then the lit face faded in over it as the calculation
// comes to the middle, as D's rows (problem-roll.tsx).
function drawSegment(canvas: SkCanvas, segment: Segment, style: SegmentStyle) {
  'worklet';
  const { skin, active } = style;
  const colors: Record<Role, string> = {
    number: skin.muted,
    operator: skin.accent,
    equals: skin.muted,
    answer: style.correct === false ? skin.wrong : skin.correct,
    placeholder: skin.accent,
  };
  canvas.save();
  canvas.translate(segment.x, 0);
  drawWithAlpha(canvas, style.alpha, () => {
    if (active > 0.02)
      drawSides(canvas, segment.path, { dx: style.dx, dy: style.dy, sides: style.paints.sides });
    const flat = Skia.Paint();
    flat.setAntiAlias(true);
    flat.setColor(Skia.Color(colors[segment.role]));
    canvas.drawPath(segment.path, flat);
    if (active < 0.01 || segment.role !== 'number')
      return;
    const lit = Skia.Paint();
    lit.setAntiAlias(true);
    lit.setShader(faceShader(skin, style.t, {
      x: segment.x,
      width: segment.width,
      digitHeight: style.layout.digitHeight,
      span: style.layout.span,
    }));
    lit.setAlphaf(active);
    canvas.drawPath(segment.path, lit);
    const edge = style.paints.edge.copy();
    edge.setAlphaf(active);
    canvas.drawPath(segment.path, edge);
  });
  canvas.restore();
}

// After drawSegment, which it calls.
function drawRow(canvas: SkCanvas, row: Row, ctx: RowContext) {
  'worklet';
  const { layout, offset } = ctx;
  const rowAlpha = clamp(RANGE - Math.abs(offset), 0, 1);
  if (rowAlpha < 0.01)
    return;
  const active = clamp(1 - Math.abs(offset), 0, 1);
  // As I: the answer, and the `=` before it, show as the calculation leaves
  // the middle.
  const answered = clamp(-offset, 0, 1);
  const s = layout.k * (SIDE + (1 - SIDE) * active);
  const { dx, dy } = extrusion(ctx.t, DEPTH * active);
  const visible = (segment: Segment) => rowAlpha
    * (segment.role === 'answer' || segment.role === 'equals' ? answered : 1);

  canvas.save();
  canvas.translate(layout.width / 2 + offset * (offset < 0 ? layout.pitchBack : layout.pitchAhead), layout.baselineY);
  canvas.scale(s, s);
  // Rows are laid out from the start of their answer (problem-rows.ts):
  // center the calculation, without its `=` as that fades out.
  const equalsWidth = row.segments.find(segment => segment.role === 'equals')?.width ?? 0;
  canvas.translate(layout.space + (row.leftWidth + equalsWidth * (1 - answered)) / 2, 0);

  // Shadows first: they sit behind the whole calculation.
  if (active > 0.02) {
    for (const segment of row.segments) {
      const alpha = visible(segment) * active;
      if (alpha < 0.01)
        continue;
      canvas.save();
      canvas.translate(segment.x + dx * 1.4 + 2, dy * 1.4 + 6);
      drawWithAlpha(canvas, alpha, () => canvas.drawPath(segment.path, ctx.paints.shadow));
      canvas.restore();
    }
  }
  // Painter's order, as in relief.ts: right to left when the sides go left.
  const segments = dx < 0 ? row.segments.slice().reverse() : row.segments;
  for (const segment of segments) {
    const alpha = visible(segment);
    if (alpha >= 0.01)
      drawSegment(canvas, segment, { ...ctx, active, alpha, correct: row.correct, dx, dy });
  }
  canvas.restore();
}
