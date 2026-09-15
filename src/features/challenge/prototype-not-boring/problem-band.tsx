import type { SkCanvas } from '@shopify/react-native-skia';
import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Problem } from '@/features/challenge/problems';
import type { NumberFeedback } from '@/features/challenge/prototype-not-boring/extruded-number';
import type { Role, Row, RowMetrics } from '@/features/challenge/prototype-not-boring/problem-rows';
import type { ReliefPaints } from '@/features/challenge/prototype-not-boring/relief';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { DepartedGlyphs } from '@/features/challenge/prototype-not-boring/use-glyph-slots';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { LeagueGothic_400Regular } from '@expo-google-fonts/league-gothic';
import { Canvas, createPicture, Picture, Skia, useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { clamp, useDerivedValue } from 'react-native-reanimated';
import { formatProblem } from '@/features/challenge/problems';
import {
  buildRows,
  measureRows,
  RANGE,
  useRoll,
  useRowShake,
} from '@/features/challenge/prototype-not-boring/problem-rows';
import {
  DEPTH,
  drawGlyphRun,
  drawSides,
  drawWithAlpha,
  DROP,
  extrusion,
  faceShader,
  FONT_UNITS,
  usePaints,
} from '@/features/challenge/prototype-not-boring/relief';
import { useGlyphSlots } from '@/features/challenge/prototype-not-boring/use-glyph-slots';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// A band of calculations above the giant answer, like Not Boring's expression
// line above its result: the current calculation in the middle, white; the
// previous one on the left with its answer in green or red; the next one on
// the right. Both sides are smaller and gray. The answer being typed stands
// below in relief, full size.
//
// On each answer the typed digits fly up into the band, shrinking and turning
// green or red, and land where the current calculation's `?` was, while the
// band slides one notch left. Band and answer share one canvas, so the digits
// that fly are the very outlines that were typed.

// The side calculations' size, relative to the current one.
const SIDE = 0.7;
// Between neighbouring calculations at their widest, and at the band's ends.
const BAND_GAP = 16;
// Above and below the band.
const BAND_PAD = 12;
// How many digits the giant answer must fit across.
const GIANT_CHARS = 4;
// One notch per answer, the same length as the flight.
const TURN_MS = 220;

type BandLayout = RowMetrics & {
  width: number;
  // Points per font unit for the current calculation.
  kc: number;
  // Between two calculations' centers.
  pitch: number;
  bandCenterY: number;
  // Points per font unit for the giant answer.
  gs: number;
  giantCenterY: number;
};

type Props = {
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  input: string;
  skin: Skin;
  tilt: SharedValue<Tilt>;
  // A wrong answer shakes the calculation that was just answered.
  feedback?: NumberFeedback | null;
};

export function ProblemBand({ problems, answers, currentIndex, input, skin, tilt, feedback }: Props) {
  const font = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  // The current calculation always shows its `?`: the answer is typed below.
  const rows = React.useMemo(
    () => (font ? buildRows(font, { problems, answers, currentIndex, hasInput: false }) : []),
    [font, problems, answers, currentIndex],
  );
  const layout = React.useMemo(
    () => (font && size.width > 0 ? computeLayout(measureRows(font, problems), size) : null),
    [font, problems, size],
  );
  // Cleared at once on an answer; the cleared digits fly to the band.
  const slots = useGlyphSlots(font, input, { align: 'center', resetKey: currentIndex });
  const roll = useRoll(currentIndex, TURN_MS);
  const shake = useRowShake(feedback);
  const paints = usePaints(skin);
  const latestAnswered = currentIndex - 1;

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!layout)
        return;
      const t = tilt.get();
      const position = roll.get();
      const departed = slots.departed.get();
      const progress = slots.departure.get();
      const shakeX = shake.get();

      for (const row of rows) {
        const placement = rowPlacement(row, position, layout);
        if (placement.alpha < 0.01)
          continue;
        const isLatest = row.index === latestAnswered;
        drawWithAlpha(canvas, placement.alpha, () => drawBandRow(canvas, row, {
          placement,
          skin,
          shakeX: isLatest ? shakeX : 0,
          // Until its digits have landed, the flight draws the answer.
          hideAnswer: isLatest && (departed.key !== row.index || progress < 1),
        }));
      }

      const { dx, dy } = extrusion(t, DEPTH);
      canvas.save();
      canvas.translate(layout.width / 2, layout.giantCenterY);
      canvas.scale(layout.gs, layout.gs);
      canvas.translate(-dx / 2, layout.digitHeight / 2 - dy / 2);
      drawGlyphRun(
        canvas,
        { paths: slots.paths.get(), widths: slots.widths.get(), xs: slots.xs.get(), vis: slots.vis.get() },
        { t, skin, paints, digitHeight: layout.digitHeight, span: GIANT_CHARS * layout.digitWidth },
      );
      canvas.restore();

      // Last, over the band and the new answer.
      const target = rows.find(row => row.index === departed.key);
      if (target && progress < 1) {
        drawFlight(canvas, departed, {
          progress,
          t,
          layout,
          skin,
          paints,
          correct: target.correct,
          target: rowPlacement(target, position, layout),
          shakeX: target.index === latestAnswered ? shakeX : 0,
        });
      }
    });
  }, [layout, rows, paints, skin, latestAnswered]);

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

// The band takes the top, sized so the widest calculation fits in the middle
// with a smaller one on each side; the giant answer takes the rest.
function computeLayout(metrics: RowMetrics, size: { width: number; height: number }): BandLayout {
  const rowWidth = metrics.maxLeft + metrics.space + metrics.maxAnswer;
  const kc = (size.width - BAND_GAP * 4) / (rowWidth * (1 + 2 * SIDE));
  const pitch = (rowWidth * kc * (1 + SIDE)) / 2 + BAND_GAP;
  const bandHeight = metrics.digitHeight * kc + BAND_PAD * 2;
  const giantHeight = Math.max(0, size.height - bandHeight);
  const gs = Math.min(
    size.width / (GIANT_CHARS * metrics.digitWidth + DEPTH * 3),
    giantHeight / (metrics.digitHeight + DEPTH * 2 + DROP),
  );
  return {
    ...metrics,
    width: size.width,
    kc,
    pitch,
    bandCenterY: bandHeight / 2,
    gs,
    giantCenterY: bandHeight + giantHeight / 2,
  };
}

// Where a calculation sits in the band at the band's current position, in
// points: its origin (the start of its answer) on the baseline, and its size.
// None of these worklets call each other: see problem-roll.tsx for why that
// matters.
function rowPlacement(row: Row, position: number, layout: BandLayout) {
  'worklet';
  const offset = row.index - position;
  const active = clamp(1 - Math.abs(offset), 0, 1);
  const s = layout.kc * (SIDE + (1 - SIDE) * active);
  // Centered on the calculation plus the widest answer, so a calculation
  // doesn't shift when its answer lands.
  const center = (layout.maxAnswer - layout.space - row.leftWidth) / 2;
  return {
    alpha: clamp(RANGE - Math.abs(offset), 0, 1),
    active,
    s,
    originX: layout.width / 2 + offset * layout.pitch - center * s,
    baselineY: layout.bandCenterY + (layout.digitHeight / 2) * s,
  };
}

type Placement = ReturnType<typeof rowPlacement>;

type BandRowContext = {
  placement: Placement;
  skin: Skin;
  shakeX: number;
  hideAnswer: boolean;
};

// Flat, no relief: relief is kept for the answer being typed. The current
// calculation's numbers light up white as it reaches the middle.
function drawBandRow(canvas: SkCanvas, row: Row, { placement, skin, shakeX, hideAnswer }: BandRowContext) {
  'worklet';
  const colors: Record<Role, string> = {
    number: skin.muted,
    operator: skin.accent,
    equals: skin.muted,
    answer: row.correct === false ? skin.wrong : skin.correct,
    placeholder: skin.accent,
  };
  canvas.save();
  canvas.translate(placement.originX + shakeX, placement.baselineY);
  canvas.scale(placement.s, placement.s);
  for (const segment of row.segments) {
    if (segment.role === 'answer' && hideAnswer)
      continue;
    canvas.save();
    canvas.translate(segment.x, 0);
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color(colors[segment.role]));
    canvas.drawPath(segment.path, paint);
    if (segment.role === 'number' && placement.active > 0.01) {
      const lit = Skia.Paint();
      lit.setAntiAlias(true);
      lit.setColor(Skia.Color(skin.ink));
      lit.setAlphaf(placement.active);
      canvas.drawPath(segment.path, lit);
    }
    canvas.restore();
  }
  canvas.restore();
}

type FlightContext = {
  // 0 as the digits leave the giant answer, 1 as they land in the band.
  progress: number;
  t: Tilt;
  layout: BandLayout;
  skin: Skin;
  paints: ReliefPaints;
  correct: boolean | null;
  target: Placement;
  shakeX: number;
};

// The answered digits, from their place in the giant answer to their place in
// the band, following the calculation as the band slides. They lose their
// relief on the way and turn from lit white to green or red.
function drawFlight(canvas: SkCanvas, departed: DepartedGlyphs, ctx: FlightContext) {
  'worklet';
  const { progress: e, t, layout, skin, target } = ctx;
  const giant = extrusion(t, DEPTH);
  const sides = extrusion(t, DEPTH * (1 - e));
  const first = departed.xs[0] ?? 0;
  const s = layout.gs + (target.s - layout.gs) * e;
  const fromY = layout.giantCenterY + layout.gs * (layout.digitHeight / 2 - giant.dy / 2);
  const flat = Skia.Paint();
  flat.setAntiAlias(true);
  flat.setColor(Skia.Color(ctx.correct === false ? skin.wrong : skin.correct));
  // The white is gone halfway: the color reads before the digits get small.
  const litAlpha = Math.max(0, 1 - e * 2);

  for (let n = 0; n < departed.count; n++) {
    // Painter's order, as in relief.ts.
    const i = sides.dx < 0 ? departed.count - 1 - n : n;
    const path = departed.paths[i];
    if (!path)
      continue;
    const x = departed.xs[i] ?? 0;
    const fromX = layout.width / 2 + layout.gs * (x - giant.dx / 2);
    const toX = target.originX + ctx.shakeX + target.s * (x - first);
    canvas.save();
    canvas.translate(fromX + (toX - fromX) * e, fromY + (target.baselineY - fromY) * e);
    canvas.scale(s, s);
    if (e < 0.98)
      drawSides(canvas, path, { dx: sides.dx, dy: sides.dy, sides: ctx.paints.sides });
    canvas.drawPath(path, flat);
    if (litAlpha > 0.01) {
      const lit = Skia.Paint();
      lit.setAntiAlias(true);
      lit.setShader(faceShader(skin, t, {
        x: 0,
        width: departed.widths[i] ?? 0,
        digitHeight: layout.digitHeight,
        span: GIANT_CHARS * layout.digitWidth,
      }));
      lit.setAlphaf(litAlpha);
      canvas.drawPath(path, lit);
    }
    canvas.restore();
  }
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
