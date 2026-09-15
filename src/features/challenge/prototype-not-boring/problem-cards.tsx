import type { SkCanvas } from '@shopify/react-native-skia';
import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Problem } from '@/features/challenge/problems';
import type { NumberFeedback } from '@/features/challenge/prototype-not-boring/extruded-number';
import type { Role, Row, RowMetrics } from '@/features/challenge/prototype-not-boring/problem-rows';
import type { GlyphRun, ReliefPaints } from '@/features/challenge/prototype-not-boring/relief';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { LeagueGothic_400Regular } from '@expo-google-fonts/league-gothic';
import { BlurStyle, Canvas, createPicture, PaintStyle, Picture, Skia, TileMode, useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { clamp, Easing, useDerivedValue, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { formatProblem } from '@/features/challenge/problems';
import { buildRows, measureRows, useRoll, useRowShake } from '@/features/challenge/prototype-not-boring/problem-rows';
import {
  DEPTH,
  drawGlyphRun,
  drawSides,
  drawTint,
  drawWithAlpha,
  extrusion,
  faceShader,
  FONT_UNITS,
  LAYERS,
  mixHex,
  usePaints,
} from '@/features/challenge/prototype-not-boring/relief';
import { useGlyphSlots } from '@/features/challenge/prototype-not-boring/use-glyph-slots';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// A's cards (the previous, current and next calculations, each on its own
// card, sliding up one place per answer) made into Not Boring objects: thick
// lacquered slabs on the black page, drawn with the digits' relief recipe
// (relief.ts), so the tilt moves their sides, the light on their faces and a
// sheen across them along with the digits. The current card stands tallest,
// biggest and lit; the others sit lower, smaller and in shade. Only the
// answer is in relief, standing on its card; the calculation is printed flat.
//
// On an answer the card lights up green or red, face, rim and digits, and
// shakes if wrong. Meanwhile the cards slide up one place: the answered one
// settles towards the page as it goes, the next one rises into the light.

// The side cards, relative to the current one.
const SIDE_HEIGHT = 0.62;
const SIDE_WIDTH = 0.92;
const SIDE_TEXT = 0.72;
// How far a card stands off the page, in points.
const DEPTH_CURRENT = 14;
const DEPTH_SIDE = 4;
const MAX_CARD_HEIGHT = 170;
const CARD_GAP = 16;
const CARD_RADIUS = 20;
const PAD_X = 24;
const PAD_Y = 8;
// Inside a card, either side of its calculation.
const TEXT_PAD = 20;
// The digits' height, relative to their card's.
const TEXT_HEIGHT = 0.46;
// One place per answer: over before the next digit lands.
const TURN_MS = 220;
const VERDICT = { duration: 120, easing: Easing.bezier(0.23, 1, 0.32, 1) };

type CardsLayout = RowMetrics & {
  width: number;
  centerY: number;
  // The current card, in points.
  cardWidth: number;
  cardHeight: number;
  // From the current card's center to its neighbours', and on between side
  // cards.
  toSide: number;
  sideStep: number;
  // Points per font unit on the current card.
  k: number;
};

type Props = {
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  input: string;
  skin: Skin;
  tilt: SharedValue<Tilt>;
  // Lights the card just answered up green or red; red also shakes it.
  feedback?: NumberFeedback | null;
};

export function ProblemCards({ problems, answers, currentIndex, input, skin, tilt, feedback }: Props) {
  const font = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  // The current card shows a `?` until something is typed.
  const hasInput = input !== '';
  const rows = React.useMemo(
    () => (font ? buildRows(font, { problems, answers, currentIndex, hasInput }) : []),
    [font, problems, answers, currentIndex, hasInput],
  );
  const layout = React.useMemo(
    () => (font && size.width > 0 ? computeLayout(measureRows(font, problems), size) : null),
    [font, problems, size],
  );
  // Cleared at once on an answer: the answered card then draws the same
  // digits in the same place.
  const slots = useGlyphSlots(font, input, { align: 'left', resetKey: currentIndex });
  const roll = useRoll(currentIndex, TURN_MS);
  const shake = useRowShake(feedback);
  const verdict = useVerdict(feedback);
  const paints = usePaints(skin);
  const cardPaints = useCardPaints(skin);
  const latest = currentIndex - 1;

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!layout)
        return;
      const at = roll.get();
      const t = tilt.get();
      const typed = { paths: slots.paths.get(), widths: slots.widths.get(), xs: slots.xs.get(), vis: slots.vis.get() };
      // Furthest from the middle first: the current card's sides and shadow
      // reach over its neighbours.
      const ordered = rows
        .map(row => ({ row, offset: row.index - at }))
        .sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset));
      for (const { row, offset } of ordered) {
        const placement = cardPlacement(offset, layout);
        if (placement.alpha < 0.01)
          continue;
        const isLatest = row.index === latest;
        const context = {
          layout,
          placement,
          t,
          skin,
          paints,
          cardPaints,
          shakeX: isLatest ? shake.get() : 0,
          verdict: isLatest ? verdict.get() : 1,
          typed: row.index === currentIndex ? typed : null,
        };
        drawWithAlpha(canvas, placement.alpha, () => {
          drawCard(canvas, row, context);
          drawCardText(canvas, row, context);
        });
      }
    });
  }, [layout, rows, paints, cardPaints, skin, currentIndex, latest]);

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

// The current card as tall as the room left for it and its two neighbours,
// the text as big as the card's height and width allow.
function computeLayout(metrics: RowMetrics, size: { width: number; height: number }): CardsLayout {
  const cardWidth = size.width - PAD_X * 2;
  const cardHeight = Math.min(
    MAX_CARD_HEIGHT,
    (size.height - PAD_Y * 2 - CARD_GAP * 2 - DEPTH_CURRENT * 1.5) / (1 + 2 * SIDE_HEIGHT),
  );
  const side = cardHeight * SIDE_HEIGHT;
  return {
    ...metrics,
    width: size.width,
    // Raised a little: the cards' sides and shadows fall below them.
    centerY: size.height / 2 - DEPTH_CURRENT / 2,
    cardWidth,
    cardHeight,
    toSide: cardHeight / 2 + CARD_GAP + side / 2,
    sideStep: side + CARD_GAP,
    k: Math.min(
      (cardHeight * TEXT_HEIGHT) / metrics.digitHeight,
      (cardWidth - TEXT_PAD * 2) / (metrics.maxLeft + metrics.space + metrics.maxAnswer + DEPTH),
    ),
  };
}

// The answer's green or red coming on, 0 to 1 from each new feedback. Kept
// with reduced motion: it's a color, and it carries the verdict.
function useVerdict(feedback: NumberFeedback | null | undefined) {
  const verdict = useSharedValue(1);
  React.useEffect(() => {
    if (feedback)
      verdict.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, VERDICT)));
  }, [feedback, verdict]);
  return verdict;
}

type CardPaints = ReturnType<typeof useCardPaints>;

// Built once per skin on the JS thread; the pictures only read them.
function useCardPaints(skin: Skin) {
  return React.useMemo(() => {
    const sides = Array.from({ length: LAYERS }, (_, layer) => {
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color(mixHex(skin.card.sideFront, skin.card.sideBack, layer / (LAYERS - 1))));
      return paint;
    });
    const shadow = Skia.Paint();
    shadow.setColor(Skia.Color('rgba(0, 0, 0, 0.7)'));
    shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 10, true));
    return { sides, shadow };
  }, [skin]);
}

type CardPlacement = ReturnType<typeof cardPlacement>;

type CardContext = {
  layout: CardsLayout;
  placement: CardPlacement;
  t: Tilt;
  skin: Skin;
  paints: ReliefPaints;
  cardPaints: CardPaints;
  shakeX: number;
  // 0 to 1: the answer's green or red coming on. 1 once settled.
  verdict: number;
  // The digits being typed, on the current card only.
  typed: GlyphRun | null;
};

// None of the worklets below call each other: see problem-roll.tsx for why
// that matters.

// Where a card sits at the cards' current position: every size, depth and
// light follows from its offset to the middle, so a quick answer interrupts
// the slide cleanly.
function cardPlacement(offset: number, layout: CardsLayout) {
  'worklet';
  const near = Math.min(Math.abs(offset), 1);
  const far = Math.max(Math.abs(offset) - 1, 0);
  return {
    cx: layout.width / 2,
    cy: layout.centerY + Math.sign(offset) * (near * layout.toSide + far * layout.sideStep),
    w: layout.cardWidth * (1 + (SIDE_WIDTH - 1) * near),
    h: layout.cardHeight * (1 + (SIDE_HEIGHT - 1) * near),
    depth: DEPTH_CURRENT + (DEPTH_SIDE - DEPTH_CURRENT) * near,
    // Points per font unit for the card's text.
    k: layout.k * (1 + (SIDE_TEXT - 1) * near),
    // 1 for the current card, in the light; 0 from its neighbours on.
    lit: 1 - near,
    // Gone past the neighbours.
    alpha: clamp(2 - Math.abs(offset), 0, 1),
  };
}

// The slab: its shadow on the page, its sides, then its face, dim, lit and
// green or red laid over one another, a sheen and a rim.
function drawCard(canvas: SkCanvas, row: Row, ctx: CardContext) {
  'worklet';
  const { placement: p, t, skin } = ctx;
  const cx = p.cx + ctx.shakeX;
  const rect = Skia.XYWHRect(cx - p.w / 2, p.cy - p.h / 2, p.w, p.h);
  const rrect = Skia.RRectXY(rect, CARD_RADIUS, CARD_RADIUS);
  const { dx, dy } = extrusion(t, p.depth);

  canvas.save();
  canvas.translate(dx * 1.4 + 2, dy * 1.4 + 8);
  canvas.drawRRect(rrect, ctx.cardPaints.shadow);
  canvas.restore();
  const outline = Skia.Path.Make();
  outline.addRRect(rrect);
  drawSides(canvas, outline, { dx, dy, sides: ctx.cardPaints.sides });

  // Lit from where the digits' light comes from (faceShader in relief.ts).
  const lx = (0.35 + t.x * 0.8) * p.w * 0.5;
  const ly = (-1 + t.y * 0.6) * p.h * 0.5;
  const paintFace = (colors: [string, string], alpha: number) => {
    const face = Skia.Paint();
    face.setAntiAlias(true);
    face.setShader(Skia.Shader.MakeLinearGradient(
      { x: cx + lx, y: p.cy + ly },
      { x: cx - lx, y: p.cy - ly },
      colors.map(color => Skia.Color(color)),
      null,
      TileMode.Clamp,
    ));
    face.setAlphaf(alpha);
    canvas.drawRRect(rrect, face);
  };
  const answered = row.correct !== null && ctx.verdict > 0.01;
  paintFace(skin.card.dim, 1);
  if (p.lit > 0.01)
    paintFace(skin.card.lit, p.lit);
  if (answered)
    paintFace(row.correct ? skin.card.correct : skin.card.wrong, ctx.verdict);

  // Across the lacquer, sliding with the tilt.
  const sheenX = cx + t.x * p.w * 0.5;
  const sheen = Skia.Paint();
  sheen.setAntiAlias(true);
  sheen.setShader(Skia.Shader.MakeLinearGradient(
    { x: sheenX - p.w * 0.3, y: rect.y },
    { x: sheenX + p.w * 0.3, y: rect.y + p.h },
    [Skia.Color('rgba(255, 255, 255, 0)'), Skia.Color('rgba(255, 255, 255, 0.07)'), Skia.Color('rgba(255, 255, 255, 0)')],
    null,
    TileMode.Clamp,
  ));
  canvas.drawRRect(rrect, sheen);

  // Lit along the top edge, fading down the sides; green or red once
  // answered.
  const rim = Skia.Paint();
  rim.setAntiAlias(true);
  rim.setStyle(PaintStyle.Stroke);
  rim.setStrokeWidth(1);
  rim.setShader(Skia.Shader.MakeLinearGradient(
    { x: 0, y: rect.y },
    { x: 0, y: rect.y + p.h },
    [Skia.Color(skin.card.rim), Skia.Color('rgba(255, 255, 255, 0)')],
    null,
    TileMode.Clamp,
  ));
  canvas.drawRRect(rrect, rim);
  if (answered) {
    const glow = Skia.Paint();
    glow.setAntiAlias(true);
    glow.setStyle(PaintStyle.Stroke);
    glow.setStrokeWidth(1.5);
    glow.setColor(Skia.Color(row.correct ? skin.correct : skin.wrong));
    glow.setAlphaf(ctx.verdict * 0.8);
    canvas.drawRRect(rrect, glow);
  }
}

// The calculation printed flat on the card, gray numbers lit white on the
// current one; the answer standing on it in relief, flat green or red once
// the card has left the middle.
function drawCardText(canvas: SkCanvas, row: Row, ctx: CardContext) {
  'worklet';
  const { placement: p, t, skin, paints, layout } = ctx;
  const colors: Record<Role, string> = {
    number: skin.muted,
    operator: skin.accent,
    equals: skin.muted,
    answer: row.correct === false ? skin.wrong : skin.correct,
    placeholder: skin.accent,
  };
  // Centered on the calculation and the widest answer, so it doesn't shift
  // as the answer comes.
  const spanCenter = (layout.maxAnswer - layout.space - row.leftWidth) / 2;
  canvas.save();
  canvas.translate(p.cx + ctx.shakeX - spanCenter * p.k, p.cy + (layout.digitHeight * p.k) / 2);
  canvas.scale(p.k, p.k);
  for (const segment of row.segments) {
    const raise = segment.role === 'answer' ? p.lit : 0;
    canvas.save();
    canvas.translate(segment.x, 0);
    if (raise > 0.02) {
      const { dx, dy } = extrusion(t, DEPTH * raise);
      drawSides(canvas, segment.path, { dx, dy, sides: paints.sides });
    }
    const flat = Skia.Paint();
    flat.setAntiAlias(true);
    flat.setColor(Skia.Color(colors[segment.role]));
    canvas.drawPath(segment.path, flat);
    if (segment.role === 'number' && p.lit > 0.01) {
      const lit = Skia.Paint();
      lit.setAntiAlias(true);
      lit.setColor(Skia.Color(skin.ink));
      lit.setAlphaf(p.lit);
      canvas.drawPath(segment.path, lit);
    }
    if (raise > 0.01) {
      drawWithAlpha(canvas, raise, () => {
        const face = Skia.Paint();
        face.setAntiAlias(true);
        face.setShader(faceShader(skin, t, {
          x: segment.x,
          width: segment.width,
          digitHeight: layout.digitHeight,
          span: layout.maxAnswer,
        }));
        canvas.drawPath(segment.path, face);
        canvas.drawPath(segment.path, paints.edge);
        drawTint(canvas, segment.path, { tint: (row.correct === false ? -1 : 1) * ctx.verdict, skin });
      });
    }
    canvas.restore();
  }
  if (ctx.typed)
    drawGlyphRun(canvas, ctx.typed, { t, skin, paints, digitHeight: layout.digitHeight, span: layout.maxAnswer });
  canvas.restore();
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
