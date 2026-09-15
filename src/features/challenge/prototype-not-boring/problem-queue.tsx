import type { SkCanvas } from '@shopify/react-native-skia';
import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Problem } from '@/features/challenge/problems';
import type { Role, Row, RowMetrics } from '@/features/challenge/prototype-not-boring/problem-rows';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { LeagueGothic_400Regular } from '@expo-google-fonts/league-gothic';
import { Canvas, createPicture, Picture, Skia, useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { clamp, Extrapolation, interpolate, useDerivedValue } from 'react-native-reanimated';
import { formatProblem } from '@/features/challenge/problems';
import { buildRows, measureRows, RANGE, useRoll } from '@/features/challenge/prototype-not-boring/problem-rows';
import { drawWithAlpha, FONT_UNITS } from '@/features/challenge/prototype-not-boring/relief';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// B's screen (the calculation above the giant answer, which flashes green or
// red in place) with the next calculation in view, to read ahead while typing
// the current answer. Two ways to show it:
// - `pile`: the calculations to come wait behind the current one, smaller,
//   higher and gray, as if further back, and drift with the tilt. On each
//   answer the pile comes forward one place: the next calculation comes down
//   into the current one's place and lights up white, and the answered one
//   comes towards the viewer and fades.
// - `line`: one line read left to right, like the upcoming words in a typing
//   test: the previous calculation on the left with its answer, the current
//   one in the middle, the next one on the right. On each answer the line
//   slides one place left.
// - `arc`: the line bent into a dome. The calculations stand on the rim of a
//   wheel, leaning with it, the current one at the top. On each answer the
//   wheel turns one notch: the answered calculation goes down the left side
//   and the one after next comes up the right. As in the pile, the current
//   and next calculations go without their `=`; the answered one gets it
//   back with its answer.
// Every way the next calculation moves into the current one's place instead
// of replacing it, so the eye follows the one it has already read.

export type QueueMode = 'pile' | 'line' | 'arc';

// The current calculation's size, in points per font unit: B's 52pt equation.
const CURRENT = 0.52;
// Pile: each place back is this much smaller than the one in front of it.
const RECEDE = 0.6;
// Pile: between the current calculation and the next, shrinking with them.
const PILE_GAP = 12;
// Pile: the calculation after the next, faint. 0 shows only the next one.
const AFTER_NEXT_ALPHA = 0.3;
// Pile: how far the tilt moves the calculations furthest back, in points.
const PARALLAX = 20;
// Pile: the answered calculation, coming forward, grows and drops this much
// per place before it's gone.
const FORWARD_GROW = 0.15;
const FORWARD_DROP = 10;
// Line: the previous and next calculations' size, relative to the current one.
const SIDE = 0.6;
// Line: between two calculations at their widest.
const LINE_GAP = 20;
// Line: kept free at the screen's edge beyond the next calculation.
const EDGE = 12;
// Arc: how much lower the previous and next calculations sit than the
// current one, in its digit heights. Sets how round the dome is.
const ARC_DROP = 0.8;
// Arc: kept free at the screen's edge; more than the line, as the side
// calculations lean outwards.
const ARC_EDGE = 20;
// Arc: room below the sides' baselines for their outer ends, tilted down.
const ARC_TILT_ROOM = 14;
// Arc: gone this many places from the top, on the way down the rim.
const ARC_FADE_END = 1.7;
const PAD_TOP = 8;
// Room below the current calculation for the answered one coming forward.
const PAD_BOTTOM = 16;
// One place per answer, as the band (problem-band.tsx).
const TURN_MS = 220;

type QueueLayout = {
  width: number;
  // Points per font unit for the current calculation.
  k: number;
  // The current calculation's digit height, in points.
  rowHeight: number;
  baselineY: number;
  // In font units: a calculation ends a space before its answer.
  space: number;
  // Line: from the current calculation's center to the next one's, and to
  // the previous one's, whose answer takes more room.
  pitchAhead: number;
  pitchBack: number;
  // Arc: the wheel's radius, in points, and the angle between two
  // calculations on its rim, in radians.
  radius: number;
  step: number;
};

type Props = {
  mode: QueueMode;
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  skin: Skin;
  tilt: SharedValue<Tilt>;
};

export function ProblemQueue({ mode, problems, answers, currentIndex, skin, tilt }: Props) {
  const font = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [width, setWidth] = React.useState(0);
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const metrics = React.useMemo(() => (font ? measureRows(font, problems) : null), [font, problems]);
  // Known before the font loads, so the giant number below doesn't jump.
  const height = queueHeight(mode, metrics?.digitHeight ?? FONT_UNITS * 0.75);
  const layout = React.useMemo(
    () => (metrics && width > 0 ? computeLayout(mode, metrics, { width, height }) : null),
    [mode, metrics, width, height],
  );
  // No `?` on the current calculation: the giant number below is its answer.
  const rows = React.useMemo(
    () => (font ? buildRows(font, { problems, answers, currentIndex, hasInput: true }) : []),
    [font, problems, answers, currentIndex],
  );
  const roll = useRoll(currentIndex, TURN_MS);

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!layout)
        return;
      const position = roll.get();
      const t = tilt.get();
      for (const row of rows) {
        const offset = row.index - position;
        const placement = mode === 'pile'
          ? pilePlacement(offset, layout, t)
          : mode === 'arc' ? arcPlacement(offset, layout) : linePlacement(offset, layout);
        if (placement.alpha < 0.01)
          continue;
        drawWithAlpha(canvas, placement.alpha, () => drawQueueRow(canvas, row, {
          placement,
          skin,
          space: layout.space,
        }));
      }
    });
  }, [layout, rows, skin, mode]);

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

// From the top of the highest calculation (the furthest back in the pile,
// the current one otherwise) to just below the lowest (the arc's sides).
function queueHeight(mode: QueueMode, digitHeight: number) {
  const h = digitHeight * CURRENT;
  const extent = mode === 'pile'
    ? ((h + PILE_GAP) * (1 - RECEDE ** RANGE)) / (1 - RECEDE) + h * RECEDE ** RANGE
    : mode === 'arc' ? h * (1 + ARC_DROP) + ARC_TILT_ROOM : h;
  return PAD_TOP + extent + PAD_BOTTOM;
}

function computeLayout(mode: QueueMode, metrics: RowMetrics, size: { width: number; height: number }): QueueLayout {
  // Line: the widest calculation in the middle and the next one whole on its
  // right. Arc: the same, with the next one as far out as the previous one
  // and its answer, so the dome is even. Pile: the widest calculation across.
  const answerRoom = (metrics.space + metrics.maxAnswer) * SIDE;
  const fit = mode === 'pile'
    ? (size.width - EDGE * 2) / metrics.maxLeft
    : mode === 'arc'
      ? (size.width / 2 - LINE_GAP - ARC_EDGE) / (metrics.maxLeft * (0.5 + SIDE) + answerRoom)
      : (size.width / 2 - LINE_GAP - EDGE) / (metrics.maxLeft * (0.5 + SIDE));
  const k = Math.min(CURRENT, fit);
  const rowHeight = metrics.digitHeight * k;
  const halves = (metrics.maxLeft / 2) * k * (1 + SIDE);
  const pitchBack = halves + answerRoom * k + LINE_GAP;
  // Arc: the circle through the current calculation's baseline and the
  // sides', pitchBack across and `drop` lower.
  const drop = rowHeight * ARC_DROP;
  const radius = (pitchBack ** 2 + drop ** 2) / (2 * drop);
  return {
    width: size.width,
    k,
    rowHeight,
    baselineY: size.height - PAD_BOTTOM - (mode === 'arc' ? ARC_TILT_ROOM + drop : 0),
    space: metrics.space,
    pitchAhead: halves + LINE_GAP,
    pitchBack,
    radius,
    step: Math.asin(Math.min(1, pitchBack / radius)),
  };
}

type Placement = {
  // The calculation's center and baseline, in points.
  x: number;
  baselineY: number;
  // Clockwise, in radians, around that point: the arc's lean.
  angle: number;
  // Points per font unit.
  s: number;
  alpha: number;
  // 1 lights the numbers white: the current calculation.
  lit: number;
  // The answer, drawn once the calculation leaves the middle.
  answerAlpha: number;
  // The `=`. Without it, the giant answer below says what the calculation
  // is equal to.
  equalsAlpha: number;
};

// None of the worklets below call each other: see problem-roll.tsx for why
// that matters.

function pilePlacement(offset: number, layout: QueueLayout, t: Tilt): Placement {
  'worklet';
  // Places back for the calculations to come, forward for the answered one.
  const back = Math.max(offset, 0);
  const forward = Math.max(-offset, 0);
  const shrink = RECEDE ** back;
  // 0 for the current calculation, towards 1 far back.
  const depth = 1 - shrink;
  // Each place back stands on the one in front of it: the sum of their
  // heights and gaps, each RECEDE times the one before.
  const rise = ((layout.rowHeight + PILE_GAP) * depth) / (1 - RECEDE);
  return {
    // What's further back moves more with the tilt, the same way as the
    // back of the digits' relief (extrusion in relief.ts).
    x: layout.width / 2 - t.x * PARALLAX * depth,
    baselineY: layout.baselineY - rise + forward * FORWARD_DROP - t.y * PARALLAX * depth,
    angle: 0,
    s: layout.k * shrink * (1 + forward * FORWARD_GROW),
    alpha: interpolate(offset, [-0.67, 0, 1, 2, 3], [0, 1, 1, AFTER_NEXT_ALPHA, 0], Extrapolation.CLAMP),
    lit: clamp(1 - Math.abs(offset), 0, 1),
    answerAlpha: 0,
    equalsAlpha: 0,
  };
}

function linePlacement(offset: number, layout: QueueLayout): Placement {
  'worklet';
  const near = clamp(1 - Math.abs(offset), 0, 1);
  return {
    x: layout.width / 2 + offset * (offset < 0 ? layout.pitchBack : layout.pitchAhead),
    baselineY: layout.baselineY,
    angle: 0,
    s: layout.k * (SIDE + (1 - SIDE) * near),
    // Gone past the previous and the next calculations.
    alpha: clamp(RANGE - Math.abs(offset), 0, 1),
    lit: near,
    // Shows as the calculation leaves the middle, so it doesn't run into the
    // next one coming in.
    answerAlpha: clamp(-offset, 0, 1),
    equalsAlpha: 1,
  };
}

// On the rim of a wheel centered below the current calculation, whose
// baseline is its top. The roll turns the wheel: each place is one step.
function arcPlacement(offset: number, layout: QueueLayout): Placement {
  'worklet';
  const near = clamp(1 - Math.abs(offset), 0, 1);
  const angle = offset * layout.step;
  return {
    x: layout.width / 2 + layout.radius * Math.sin(angle),
    baselineY: layout.baselineY + layout.radius * (1 - Math.cos(angle)),
    angle,
    s: layout.k * (SIDE + (1 - SIDE) * near),
    // Fades on the way down the rim, before it drops out of the canvas.
    alpha: interpolate(Math.abs(offset), [1, ARC_FADE_END], [1, 0], Extrapolation.CLAMP),
    lit: near,
    // As the line: shows as the calculation leaves the top, and the `=`
    // with it.
    answerAlpha: clamp(-offset, 0, 1),
    equalsAlpha: clamp(-offset, 0, 1),
  };
}

type RowStyle = { placement: Placement; skin: Skin; space: number };

// Flat, as B's equation: relief is kept for the answer. Gray numbers, lit
// white in the middle.
function drawQueueRow(canvas: SkCanvas, row: Row, { placement, skin, space }: RowStyle) {
  'worklet';
  const colors: Record<Role, string> = {
    number: skin.muted,
    operator: skin.accent,
    equals: skin.muted,
    answer: row.correct === false ? skin.wrong : skin.correct,
    placeholder: skin.accent,
  };
  canvas.save();
  canvas.translate(placement.x, placement.baselineY);
  canvas.rotate((placement.angle * 180) / Math.PI, 0, 0);
  canvas.scale(placement.s, placement.s);
  // Rows are laid out from the start of their answer: center the
  // calculation, without its `=` as that fades out.
  const equalsWidth = row.segments.find(segment => segment.role === 'equals')?.width ?? 0;
  canvas.translate(space + (row.leftWidth + equalsWidth * (1 - placement.equalsAlpha)) / 2, 0);
  for (const segment of row.segments) {
    const alpha = segment.role === 'answer'
      ? placement.answerAlpha
      : segment.role === 'equals' ? placement.equalsAlpha : 1;
    if (alpha < 0.01)
      continue;
    canvas.save();
    canvas.translate(segment.x, 0);
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color(colors[segment.role]));
    paint.setAlphaf(alpha);
    canvas.drawPath(segment.path, paint);
    if (segment.role === 'number' && placement.lit > 0.01) {
      const lit = Skia.Paint();
      lit.setAntiAlias(true);
      lit.setColor(Skia.Color(skin.ink));
      lit.setAlphaf(placement.lit);
      canvas.drawPath(segment.path, lit);
    }
    canvas.restore();
  }
  canvas.restore();
}
