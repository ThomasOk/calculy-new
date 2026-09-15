import type { SkCanvas } from '@shopify/react-native-skia';
import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Problem } from '@/features/challenge/problems';
import type { NumberFeedback } from '@/features/challenge/prototype-not-boring/extruded-number';
import type { Role, Row, Segment } from '@/features/challenge/prototype-not-boring/problem-rows';
import type { GlyphRun, ReliefPaints } from '@/features/challenge/prototype-not-boring/relief';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
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
  drawSides,
  drawWithAlpha,
  DROP,
  extrusion,
  faceShader,
  FONT_UNITS,
  placeGlyph,
  usePaints,
} from '@/features/challenge/prototype-not-boring/relief';
import { useGlyphSlots } from '@/features/challenge/prototype-not-boring/use-glyph-slots';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// The previous, current and next calculations as a roll. Relief marks the
// current one: it stands out of the page at full size, the others lie flat at
// SMALL size. On each answer the roll turns one notch: the answered row sinks
// into the page as it rises, and the next one grows out of it. Every row's
// size, depth and color follow from one value, the roll's position, so the
// turn is continuous and a quick answer interrupts it cleanly.

const SMALL = 0.5;
const ROW_GAP = 22;
// One notch per answer: over before the next digit lands.
const TURN_MS = 200;

type Props = {
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  input: string;
  skin: Skin;
  tilt: SharedValue<Tilt>;
  // A wrong answer shakes the row that was just answered.
  feedback?: NumberFeedback | null;
};

export function ProblemRoll({ problems, answers, currentIndex, input, skin, tilt, feedback }: Props) {
  const font = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const hasInput = input !== '';
  const rows = React.useMemo(
    () => (font ? buildRows(font, { problems, answers, currentIndex, hasInput }) : []),
    [font, problems, answers, currentIndex, hasInput],
  );
  const metrics = React.useMemo(() => (font ? measureRows(font, problems) : null), [font, problems]);
  // The digits being typed, dropping in. Cleared at once on an answer: the
  // answered row then draws the same digits in the same place.
  const slots = useGlyphSlots(font, input, { align: 'left', resetKey: currentIndex });
  const roll = useRoll(currentIndex, TURN_MS);
  const shake = useRowShake(feedback);
  const paints = usePaints(skin);
  const shakeRow = currentIndex - 1;

  const scale = metrics && size.width > 0
    ? Math.min(
        size.width / (metrics.maxLeft + metrics.space + metrics.maxInput + DEPTH * 2),
        size.height / (metrics.digitHeight * (1 + 2 * SMALL) + ROW_GAP * 2 + DEPTH * 2 + DROP),
      )
    : 0;

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!metrics || scale === 0)
        return;
      const t = tilt.get();
      const position = roll.get();
      const spacing = (metrics.digitHeight * (1 + SMALL)) / 2 + ROW_GAP;
      const input = {
        paths: slots.paths.get(),
        widths: slots.widths.get(),
        xs: slots.xs.get(),
        vis: slots.vis.get(),
      };

      canvas.translate(size.width / 2, size.height / 2);
      canvas.scale(scale, scale);
      // Center the widest possible row, from the longest calculation to the
      // widest answer.
      canvas.translate((metrics.maxLeft + metrics.space - metrics.maxInput) / 2, 0);

      for (const row of rows) {
        const offset = row.index - position;
        const alpha = clamp(RANGE - Math.abs(offset), 0, 1);
        if (alpha < 0.01)
          continue;
        const active = clamp(1 - Math.abs(offset), 0, 1);
        const s = SMALL + (1 - SMALL) * active;
        canvas.save();
        canvas.translate(row.index === shakeRow ? shake.get() / scale : 0, offset * spacing);
        canvas.scale(s, s);
        canvas.translate(0, metrics.digitHeight / 2);
        drawWithAlpha(canvas, alpha, () => drawRow(canvas, row, {
          active,
          t,
          skin,
          paints,
          digitHeight: metrics.digitHeight,
          span: metrics.maxLeft + metrics.maxInput,
          input: row.index === currentIndex ? input : null,
        }));
        canvas.restore();
      }
    });
  }, [metrics, scale, size, rows, paints, skin, currentIndex, shakeRow]);

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

type RowContext = {
  // 1 for the current row, 0 for a flat one, in between while the roll turns.
  active: number;
  t: Tilt;
  skin: Skin;
  paints: ReliefPaints;
  digitHeight: number;
  span: number;
  input: GlyphRun | null;
};

// The worklets below must stay in this order: a worklet captures the
// functions it calls when its definition runs, and the worklets Babel plugin
// turns these declarations into assignments, which aren't hoisted. A worklet
// calling one defined further down gets `undefined`.

// Flat color first, then the lit face faded in over it as the row rises: an
// answer goes from lit white to green or red as it leaves.
function drawFace(canvas: SkCanvas, segment: Segment, ctx: RowContext & { correct: boolean | null }) {
  'worklet';
  const { skin, active } = ctx;
  const flatColors: Record<Role, string> = {
    number: skin.muted,
    operator: skin.accent,
    equals: skin.muted,
    answer: ctx.correct === false ? skin.wrong : skin.correct,
    placeholder: skin.muted,
  };
  const flat = Skia.Paint();
  flat.setAntiAlias(true);
  flat.setColor(Skia.Color(flatColors[segment.role]));
  canvas.drawPath(segment.path, flat);
  if (active < 0.01)
    return;

  const isLit = segment.role === 'number' || segment.role === 'answer';
  const lit = Skia.Paint();
  lit.setAntiAlias(true);
  if (isLit) {
    lit.setShader(faceShader(skin, ctx.t, {
      x: segment.x,
      width: segment.width,
      digitHeight: ctx.digitHeight,
      span: ctx.span,
    }));
  }
  else {
    lit.setColor(Skia.Color(segment.role === 'operator' ? skin.accent : skin.muted));
  }
  lit.setAlphaf(active);
  canvas.drawPath(segment.path, lit);
  if (isLit) {
    const edge = ctx.paints.edge.copy();
    edge.setAlphaf(active);
    canvas.drawPath(segment.path, edge);
  }
}

function drawInput(canvas: SkCanvas, ctx: RowContext, { dx, dy }: { dx: number; dy: number }) {
  'worklet';
  const input = ctx.input;
  if (!input)
    return;
  const count = input.paths.length;
  for (let n = 0; n < count; n++) {
    const i = dx < 0 ? count - 1 - n : n;
    const path = input.paths[i];
    const v = input.vis[i] ?? 0;
    if (!path || v < 0.01)
      continue;
    const x = input.xs[i] ?? 0;
    const width = input.widths[i] ?? 0;
    canvas.save();
    placeGlyph(canvas, { x, width, v }, ctx.digitHeight);
    drawWithAlpha(canvas, v, () => {
      if (ctx.active > 0.02)
        drawSides(canvas, path, { dx, dy, sides: ctx.paints.sides });
      const face = Skia.Paint();
      face.setAntiAlias(true);
      face.setShader(faceShader(ctx.skin, ctx.t, { x, width, digitHeight: ctx.digitHeight, span: ctx.span }));
      canvas.drawPath(path, face);
      canvas.drawPath(path, ctx.paints.edge);
    });
    canvas.restore();
  }
}

// After drawFace and drawInput, which it calls: see the note above drawFace.
function drawRow(canvas: SkCanvas, row: Row, ctx: RowContext) {
  'worklet';
  const { dx, dy } = extrusion(ctx.t, DEPTH * ctx.active);
  const raised = ctx.active > 0.02;

  // Shadows first: they sit behind the whole row.
  if (raised) {
    for (const segment of row.segments) {
      if (segment.role === 'placeholder')
        continue;
      canvas.save();
      canvas.translate(segment.x + dx * 1.4 + 2, dy * 1.4 + 6);
      drawWithAlpha(canvas, ctx.active, () => canvas.drawPath(segment.path, ctx.paints.shadow));
      canvas.restore();
    }
  }

  // Painter's order, as in relief.ts: right to left when the sides go left.
  // The typed digits are the rightmost shapes of the row.
  const segments = dx < 0 ? row.segments.slice().reverse() : row.segments;
  if (dx < 0)
    drawInput(canvas, ctx, { dx, dy });
  for (const segment of segments) {
    canvas.save();
    canvas.translate(segment.x, 0);
    if (raised && segment.role !== 'placeholder')
      drawSides(canvas, segment.path, { dx, dy, sides: ctx.paints.sides });
    drawFace(canvas, segment, { ...ctx, correct: row.correct });
    canvas.restore();
  }
  if (dx >= 0)
    drawInput(canvas, ctx, { dx, dy });
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
