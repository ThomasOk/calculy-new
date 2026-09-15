import type { SkCanvas, SkColor, SkFont, SkPath } from '@shopify/react-native-skia';
import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Problem } from '@/features/challenge/problems';
import type { Hit } from '@/features/challenge/prototype-not-boring/answer-hit';
import type { NumberFeedback } from '@/features/challenge/prototype-not-boring/extruded-number';
import type { Box, InkItem } from '@/features/challenge/prototype-not-boring/pagaille-paint';
import type { GlyphRun } from '@/features/challenge/prototype-not-boring/relief';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { LeagueGothic_400Regular } from '@expo-google-fonts/league-gothic';
import { Canvas, ClipOp, createPicture, Picture, Skia, useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { clamp, Extrapolation, interpolate, useDerivedValue, useReducedMotion } from 'react-native-reanimated';
import { formatProblem } from '@/features/challenge/problems';
import {
  drawSparks,
  popScale,
  STAMP_ENTER,
  STAMP_FADE_IN,
  useHit,
  usePress,
  useScroll,
} from '@/features/challenge/prototype-not-boring/answer-hit';
import { drawInk, SHEET, SHEET_TILT, splashPaths } from '@/features/challenge/prototype-not-boring/pagaille-paint';
import { ON_SPLASH, wobble } from '@/features/challenge/prototype-not-boring/pagaille-style';
import { fontText, useRowShake } from '@/features/challenge/prototype-not-boring/problem-rows';
import { drawWithAlpha, FONT_UNITS, measure, textWidth } from '@/features/challenge/prototype-not-boring/relief';
import { useGlyphSlots } from '@/features/challenge/prototype-not-boring/use-glyph-slots';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// The calculations as a Persona menu, in a mess: stacked down the stage,
// each leaning its own way, at its own size, overlapping a little. The
// current one is the selected item: the biggest, in black on a splash of
// paint, its answer typed in place in white with a hard black outline. The
// previous one sits above with its answer in green or red; the next one
// below. Never more than these three at rest: the row about to leave or
// arrive only shows while the stack is mid-turn, and costs nothing at rest
// (drawRow skips a row once its place's alpha is zero).
// Each answer plays answer-hit.ts's hit, hitstop and notch, and every
// calculation moves one place, turning and resizing into that place's lean
// and size: the stack reshuffles. The answered calculation keeps its splash,
// now green or red, which shrinks away with it; the next one's splash is
// brushed on, left to right, as it comes into place. From COMBO_FROM correct
// answers in a row, a black tag under the splash counts them, like the
// subtitle under a Persona menu's selected item.
// Fat serif digits (Abril Fatface), each letter a little uneven for the
// ransom-note look, but not so much that a number doesn't read at a glance;
// operators and the tag in League Gothic. The splash takes the skin's
// accent, not Persona's red, so that green and red keep meaning right and
// wrong.

// Each place in the stack, by its offset from the current calculation: its
// center (y in the current calculation's digit heights, x in stage widths),
// its lean in degrees (negative rises to the right), its size relative to
// the current one, and its opacity. -2 and 2 are holding places, off at
// rest (PLACE_ALPHA 0): a row only passes through them mid-turn, fading in
// on its way to a visible place or out on its way from one. Kept a step
// further than the visible range so nothing pops in or out of the stack.
const OFFSETS = [-2, -1, 0, 1, 2];
const PLACE_Y = [-2.6, -1.75, 0, 1.75, 2.8];
const PLACE_X = [-0.14, -0.1, 0, 0.08, -0.05];
const PLACE_ANGLE = [-3, -10, -6, -13, 4];
const PLACE_SIZE = [0.4, 0.55, 1, 0.62, 0.46];
const PLACE_ALPHA = [0, 1, 1, 1, 0];
// Each calculation's own lean, in degrees, and sideways shift, in stage
// widths, either way, on top of its place's: the same wherever it stands.
const ROW_LEAN = 3;
const ROW_SHIFT = 0.03;
// Calculations built either side of the current one: the ones on their way
// out and in included.
const BUILT = 2;
// The ransom-note look: each letter of a calculation leans up to GLYPH_LEAN
// degrees either way and is up to GLYPH_SIZE bigger or smaller, grown from
// its baseline; the first one is CAPITAL times bigger, like the menu's
// initials. The answer's digits stay straight: they're read.
const GLYPH_LEAN = 4;
const GLYPH_SIZE = 0.06;
const CAPITAL = 1.16;
// In font units: between a calculation's parts, between its `=` and its
// answer, and between the letters of a number, tight as the menu's words.
const PART_GAP = 10;
const ANSWER_GAP = 16;
const TRACKING = -2;
// The splash, beyond the text on each side, in digit heights. Its torn
// shape, the white sheet under it and the answer's ink are in
// pagaille-paint.ts, shared with the countdown and the score.
const SPLASH_LEFT = 0.55;
const SPLASH_RIGHT = 0.35;
const SPLASH_TOP = 0.3;
const SPLASH_BOTTOM = 0.32;
// The answered calculation's splash leaves shrinking to this.
const SPLASH_OUT = 0.8;
// The splash's thump as a typed digit lands.
const THUMP = 0.035;
// A typed digit comes down onto the splash from this many times its size.
const STAMP = 1.35;
const SPARK_WIDTH = 5;
// The combo tag: from this many correct answers in a row. Its text's height
// in digit heights; its padding and slant in its own font units; how far it
// hangs below the splash, in digit heights; its lean on top of the row's.
const COMBO_FROM = 2;
const TAG_HEIGHT = 0.3;
const TAG_PAD = { x: 14, y: 9 };
const TAG_SKEW = 10;
const TAG_DROP = 0.2;
const TAG_LEAN = 4;
// What's further back in the stack moves more with the tilt, in points.
const PARALLAX = 14;
// Kept free at the screen's sides, in points. The splash bleeds past it.
const EDGE = 16;
// Room for the calculations' lean, above and below, in digit heights.
const LEAN_ROOM = 0.35;
// The current calculation's size tops out at this, in points per font unit.
const MAX_SCALE = 0.95;

type Props = {
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  input: string;
  skin: Skin;
  tilt: SharedValue<Tilt>;
  // The answer just confirmed: its hit, and how the stack moves.
  feedback?: NumberFeedback | null;
};

export function ProblemPagaille({ problems, answers, currentIndex, input, skin, tilt, feedback = null }: Props) {
  const serif = useFont(AbrilFatface_400Regular, FONT_UNITS);
  const gothic = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);
  const reducedMotion = useReducedMotion();

  const fonts = React.useMemo(() => (serif && gothic ? { serif, gothic } : null), [serif, gothic]);
  const metrics = React.useMemo(() => (fonts ? measureStack(fonts, problems) : null), [fonts, problems]);
  const rows = React.useMemo(
    () => (fonts && metrics ? buildRows(fonts, { problems, answers, currentIndex, metrics }) : []),
    [fonts, metrics, problems, answers, currentIndex],
  );
  const layout = React.useMemo(
    () => (metrics && size.width > 0 ? computeLayout(metrics, size) : null),
    [metrics, size],
  );
  // The digits being typed, stamped in. Cleared at once on an answer: the
  // answered calculation then draws the same digits in the same place.
  const slots = useGlyphSlots(serif, input, { align: 'left', resetKey: currentIndex, enter: STAMP_ENTER });
  const roll = useScroll(currentIndex, feedback);
  const press = usePress(input);
  const hit = useHit(feedback);
  const shake = useRowShake(feedback);

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!layout)
        return;
      const position = roll.get();
      const ctx: RowContext = {
        layout,
        position,
        currentIndex,
        t: tilt.get(),
        skin,
        reducedMotion,
        run: { paths: slots.paths.get(), widths: slots.widths.get(), xs: slots.xs.get(), vis: slots.vis.get() },
        press: press.get(),
        hit: { pop: hit.pop.get(), flash: hit.flash.get(), sparks: hit.sparks.get() },
        shake: shake.get(),
      };
      // Back to front: the one nearest the current place last, on top.
      const order = rows.slice().sort((a, b) => Math.abs(b.index - position) - Math.abs(a.index - position));
      for (const row of order)
        drawRow(canvas, row, ctx);
    });
  }, [layout, rows, skin, reducedMotion, currentIndex]);

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

type Fonts = { serif: SkFont; gothic: SkFont };
type Role = 'number' | 'operator' | 'equals' | 'answer';
// A letter, from its left edge and baseline, in font units; grown by `size`
// and turned by `lean` degrees about the middle of its baseline.
type Glyph = { path: SkPath; x: number; width: number; role: Role; lean: number; size: number };
type Tag = { text: SkPath; plate: SkPath; width: number; scale: number };
type StackRow = {
  index: number;
  // The calculation's letters, then its answer's, if answered.
  glyphs: Glyph[];
  // The calculation's left edge, in font units: its answer starts at 0.
  start: number;
  correct: boolean | null;
  splash: SkPath;
  splatter: SkPath;
  box: Box;
  lean: number;
  shift: number;
  combo: Tag | null;
};
type Metrics = { digitHeight: number; maxLeft: number; maxAnswer: number };

// The calculation's letters, left to right from 0, and its width. The
// operator in League Gothic, which has `−` and `×`.
function layoutCalculation({ serif, gothic }: Fonts, problem: Problem) {
  const [left = '', operator = '', right = ''] = formatProblem(problem).split(' ');
  const parts: [string, Role][] = [[left, 'number'], [fontText(gothic, operator), 'operator'], [right, 'number'], ['=', 'equals']];
  const placed: { char: string; x: number; width: number; role: Role }[] = [];
  let x = 0;
  for (const [text, role] of parts) {
    if (placed.length > 0)
      x += PART_GAP;
    const font = role === 'operator' ? gothic : serif;
    text.split('').forEach((char, i) => {
      if (i > 0)
        x += TRACKING;
      const width = textWidth(font, char);
      placed.push({ char, x, width, role });
      x += width;
    });
  }
  return { placed, width: x };
}

// Sized for the whole run, so the calculations never change size mid-run.
function measureStack(fonts: Fonts, problems: Problem[]): Metrics {
  return {
    digitHeight: measure(fonts.serif).digitHeight,
    maxLeft: Math.max(0, ...problems.map(problem => layoutCalculation(fonts, problem).width)),
    maxAnswer: Math.max(
      textWidth(fonts.serif, '00'),
      ...problems.map(problem => textWidth(fonts.serif, String(problem.answer))),
    ),
  };
}

// Correct answers in a row just before the calculation at `index`.
function streakBefore(problems: Problem[], answers: number[], index: number) {
  let streak = 0;
  for (let i = index - 1; i >= 0 && answers[i] === problems[i]?.answer; i--)
    streak++;
  return streak;
}

// The black tag counting the combo, in League Gothic, or null below
// COMBO_FROM. From its text's left end and baseline, in its own font units.
function comboTag(gothic: SkFont, { streak, digitHeight }: { streak: number; digitHeight: number }): Tag | null {
  if (streak < COMBO_FROM)
    return null;
  const label = fontText(gothic, `COMBO ×${streak}`);
  const text = Skia.Path.MakeFromText(label, 0, 0, gothic);
  if (!text)
    return null;
  const width = textWidth(gothic, label);
  const height = measure(gothic).digitHeight;
  const plate = Skia.Path.Make();
  plate.moveTo(-TAG_PAD.x + TAG_SKEW, -height - TAG_PAD.y);
  plate.lineTo(width + TAG_PAD.x + TAG_SKEW, -height - TAG_PAD.y);
  plate.lineTo(width + TAG_PAD.x, TAG_PAD.y);
  plate.lineTo(-TAG_PAD.x, TAG_PAD.y);
  plate.close();
  return { text, plate, width, scale: (TAG_HEIGHT * digitHeight) / height };
}

type RowInput = { problems: Problem[]; answers: number[]; index: number; metrics: Metrics };

function buildRow(fonts: Fonts, { problems, answers, index, metrics }: RowInput): StackRow {
  const problem = problems[index]!;
  const { placed, width } = layoutCalculation(fonts, problem);
  const start = -ANSWER_GAP - width;
  const glyphs: Glyph[] = [];
  placed.forEach(({ char, x, width: glyphWidth, role }, i) => {
    const path = Skia.Path.MakeFromText(char, 0, 0, role === 'operator' ? fonts.gothic : fonts.serif);
    const seed = index * 17 + i;
    if (path) {
      const size = (i === 0 ? CAPITAL : 1) + wobble(seed + 5) * GLYPH_SIZE;
      glyphs.push({ path, x: start + x, width: glyphWidth, role, lean: wobble(seed) * GLYPH_LEAN, size });
    }
  });
  // Laid out as useGlyphSlots lays out the typed digits, to take their place.
  const answer = answers[index];
  let x = 0;
  for (const char of answer === undefined ? [] : String(answer).split('')) {
    const glyphWidth = textWidth(fonts.serif, char);
    const path = Skia.Path.MakeFromText(char, 0, 0, fonts.serif);
    if (path)
      glyphs.push({ path, x, width: glyphWidth, role: 'answer', lean: 0, size: 1 });
    x += glyphWidth;
  }
  const h = metrics.digitHeight;
  const box = {
    x0: start - SPLASH_LEFT * h,
    x1: metrics.maxAnswer + SPLASH_RIGHT * h,
    y0: -h * (1 + SPLASH_TOP),
    y1: h * SPLASH_BOTTOM,
  };
  return {
    index,
    glyphs,
    start,
    correct: answer === undefined ? null : answer === problem.answer,
    ...splashPaths(box, index),
    box,
    lean: wobble(index * 7 + 3) * ROW_LEAN,
    shift: wobble(index * 5 + 1) * ROW_SHIFT,
    combo: comboTag(fonts.gothic, { streak: streakBefore(problems, answers, index), digitHeight: h }),
  };
}

type BuildInput = { problems: Problem[]; answers: number[]; currentIndex: number; metrics: Metrics };

function buildRows(fonts: Fonts, { problems, answers, currentIndex, metrics }: BuildInput): StackRow[] {
  const rows: StackRow[] = [];
  const last = Math.min(problems.length - 1, currentIndex + BUILT);
  for (let index = Math.max(0, currentIndex - BUILT); index <= last; index++)
    rows.push(buildRow(fonts, { problems, answers, index, metrics }));
  return rows;
}

type StackLayout = {
  width: number;
  // Points per font unit for the current calculation.
  k: number;
  // The current calculation's digit height, in points.
  rowHeight: number;
  // The current calculation's center, in points.
  cx: number;
  cy: number;
  // The widest answer's right end, in font units.
  end: number;
  digitHeight: number;
};

// As big as the widest calculation allows across, and the stack, from the
// previous calculation to the one after next, allows down; the stack
// centered in the stage.
function computeLayout(metrics: Metrics, size: { width: number; height: number }): StackLayout {
  const h = metrics.digitHeight;
  const span = metrics.maxLeft + ANSWER_GAP + metrics.maxAnswer + h * (CAPITAL - 1);
  const above = -PLACE_Y[1]! + PLACE_SIZE[1]! / 2 + LEAN_ROOM;
  const below = PLACE_Y[4]! + PLACE_SIZE[4]! / 2 + LEAN_ROOM;
  const k = Math.min((size.width - EDGE * 2) / span, MAX_SCALE, size.height / ((above + below) * h));
  const rowHeight = h * k;
  return {
    width: size.width,
    k,
    rowHeight,
    cx: size.width / 2,
    cy: size.height / 2 + ((above - below) / 2) * rowHeight,
    end: metrics.maxAnswer,
    digitHeight: h,
  };
}

type RowContext = {
  layout: StackLayout;
  // The stack's position: currentIndex at rest.
  position: number;
  currentIndex: number;
  t: Tilt;
  skin: Skin;
  reducedMotion: boolean;
  // The digits being typed, drawn on the current calculation.
  run: GlyphRun;
  // The thump as a typed digit lands, from 1 back to 0.
  press: number;
  // The answered calculation's hit, and its shake in points.
  hit: Hit;
  shake: number;
};

// The worklets below must stay in this order: a worklet captures the
// functions it calls when its definition runs (see problem-roll.tsx).

type Place = { x: number; y: number; angle: number; size: number; alpha: number };

// Between the places around `offset`.
function placeAt(offset: number): Place {
  'worklet';
  const at = (values: number[]) => interpolate(offset, OFFSETS, values, Extrapolation.CLAMP);
  return { x: at(PLACE_X), y: at(PLACE_Y), angle: at(PLACE_ANGLE), size: at(PLACE_SIZE), alpha: at(PLACE_ALPHA) };
}

function mixColor(from: SkColor, to: SkColor, amount: number): SkColor {
  'worklet';
  const mixed = new Float32Array(4);
  for (let i = 0; i < 4; i++)
    mixed[i] = from[i]! + (to[i]! - from[i]!) * amount;
  return mixed;
}

function drawGlyph(canvas: SkCanvas, glyph: Glyph, paint: ReturnType<typeof Skia.Paint>) {
  'worklet';
  canvas.save();
  canvas.translate(glyph.x + glyph.width / 2, 0);
  canvas.rotate(glyph.lean, 0, 0);
  canvas.scale(glyph.size, glyph.size);
  canvas.translate(-glyph.width / 2, 0);
  canvas.drawPath(glyph.path, paint);
  canvas.restore();
}

type SplashStyle = { lit: number; skin: Skin; t: Tilt; reducedMotion: boolean; press: number; flash: number };

// The accent splash under a calculation coming to the current place,
// brushed on from the left; green or red under an answered one, shrinking
// away as it leaves. A white sheet peeks out from under it.
function drawSplash(canvas: SkCanvas, row: StackRow, style: SplashStyle) {
  'worklet';
  const { lit, skin, t } = style;
  if (lit < 0.01)
    return;
  const { box } = row;
  const answered = row.correct !== null;
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;
  canvas.save();
  const grow = (answered ? SPLASH_OUT + (1 - SPLASH_OUT) * lit : 1) * (1 + THUMP * style.press);
  canvas.translate(cx, cy);
  canvas.scale(grow, grow);
  canvas.translate(-cx, -cy);
  // Reduced motion: no brush, it fades in.
  const brushed = !answered && lit < 0.999 && !style.reducedMotion;
  if (brushed) {
    const h = box.y1 - box.y0;
    const reach = box.x1 - box.x0 + h * 3;
    canvas.clipRect(Skia.XYWHRect(box.x0 - h * 1.5, box.y0 - h * 2, reach * lit, h * 5), ClipOp.Intersect, true);
  }
  drawWithAlpha(canvas, brushed ? 1 : lit, () => {
    const sheet = Skia.Paint();
    sheet.setAntiAlias(true);
    sheet.setColor(Skia.Color(skin.ink));
    canvas.save();
    canvas.translate(SHEET.x - t.x * SHEET_TILT, SHEET.y - t.y * SHEET_TILT);
    canvas.drawPath(row.splash, sheet);
    canvas.restore();
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color(!answered ? skin.accent : row.correct ? skin.correct : skin.wrong));
    canvas.drawPath(row.splash, paint);
    canvas.drawPath(row.splatter, paint);
    if (style.flash > 0.01) {
      const white = Skia.Paint();
      white.setAntiAlias(true);
      white.setColor(Skia.Color(skin.ink));
      white.setAlphaf(style.flash);
      canvas.drawPath(row.splash, white);
    }
  });
  canvas.restore();
}

// Gray numbers above, white below, orange operators; black on the splash.
function drawCalculation(canvas: SkCanvas, row: StackRow, { lit, skin }: { lit: number; skin: Skin }) {
  'worklet';
  const dark = Skia.Color(ON_SPLASH);
  const answered = row.correct !== null;
  for (const glyph of row.glyphs) {
    if (glyph.role === 'answer')
      continue;
    const base = glyph.role === 'operator'
      ? skin.accent
      : glyph.role === 'number' && !answered ? skin.ink : skin.muted;
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(mixColor(Skia.Color(base), dark, lit));
    drawGlyph(canvas, glyph, paint);
  }
}

type AnswerStyle = { lit: number; skin: Skin; hit: Hit | null; reducedMotion: boolean; digitHeight: number };

// White while on its splash, then green or red. The hit pops a correct
// answer and throws sparks; it sinks a wrong one.
function drawAnswer(canvas: SkCanvas, row: StackRow, style: AnswerStyle) {
  'worklet';
  const digits = row.glyphs.filter(glyph => glyph.role === 'answer');
  if (digits.length === 0 || row.correct === null)
    return;
  const { skin, hit } = style;
  const correct = row.correct;
  const scale = popScale(hit, { correct, reducedMotion: style.reducedMotion });
  const verdict = Skia.Color(correct ? skin.correct : skin.wrong);
  drawInk(
    canvas,
    digits.map(glyph => ({ path: glyph.path, x: glyph.x, width: glyph.width, scale, alpha: 1 })),
    { fill: mixColor(verdict, Skia.Color(skin.ink), style.lit), digitHeight: style.digitHeight },
  );
  if (!hit || !correct || style.reducedMotion)
    return;
  const last = digits[digits.length - 1]!;
  const width = last.x + last.width;
  const h = style.digitHeight;
  drawSparks(
    canvas,
    { cx: width / 2, cy: -h / 2, rx: width / 2, ry: h / 2, digitHeight: h },
    { progress: hit.sparks, seed: row.index, color: skin.ink, width: SPARK_WIDTH },
  );
}

// The digits being typed, each stamped down from STAMP times its size.
function drawInput(canvas: SkCanvas, run: GlyphRun, style: { skin: Skin; reducedMotion: boolean; digitHeight: number }) {
  'worklet';
  const items: InkItem[] = [];
  for (let i = 0; i < run.paths.length; i++) {
    const path = run.paths[i];
    const v = run.vis[i] ?? 0;
    if (!path || v < 0.01)
      continue;
    items.push({
      path,
      x: run.xs[i] ?? 0,
      width: run.widths[i] ?? 0,
      scale: style.reducedMotion ? 1 : 1 + (STAMP - 1) * (1 - v),
      alpha: Math.min(1, v * STAMP_FADE_IN),
    });
  }
  drawInk(canvas, items, { fill: Skia.Color(style.skin.ink), digitHeight: style.digitHeight });
}

// The combo tag, hanging from the splash's right end.
function drawTag(canvas: SkCanvas, row: StackRow, { lit, skin, digitHeight }: { lit: number; skin: Skin; digitHeight: number }) {
  'worklet';
  const tag = row.combo;
  if (!tag || lit < 0.01)
    return;
  canvas.save();
  canvas.translate(row.box.x1 - (tag.width + TAG_PAD.x * 2) * tag.scale, row.box.y1 + TAG_DROP * digitHeight);
  canvas.rotate(TAG_LEAN, 0, 0);
  canvas.scale(tag.scale, tag.scale);
  const plate = Skia.Paint();
  plate.setAntiAlias(true);
  plate.setColor(Skia.Color('#000000'));
  plate.setAlphaf(lit);
  canvas.drawPath(tag.plate, plate);
  const text = Skia.Paint();
  text.setAntiAlias(true);
  text.setColor(Skia.Color(skin.ink));
  text.setAlphaf(lit);
  canvas.drawPath(tag.text, text);
  canvas.restore();
}

// One calculation, at its place in the stack. After the worklets it calls.
function drawRow(canvas: SkCanvas, row: StackRow, ctx: RowContext) {
  'worklet';
  const offset = row.index - ctx.position;
  const place = placeAt(offset);
  if (place.alpha < 0.01)
    return;
  const { layout, t, skin, reducedMotion } = ctx;
  // 1 on the splash. A calculation coming in lights up as it arrives and
  // stays lit through the notch's overshoot; an answered one dims as it
  // leaves.
  const lit = clamp(row.correct === null ? 1 - offset : 1 + offset, 0, 1);
  const isCurrent = row.index === ctx.currentIndex;
  const isAnswered = row.index === ctx.currentIndex - 1;
  const back = reducedMotion ? 0 : (1 - place.size) * PARALLAX;
  const s = layout.k * place.size;
  const digitHeight = layout.digitHeight;
  canvas.save();
  canvas.translate(
    layout.cx + (place.x + row.shift) * layout.width - t.x * back + (isAnswered ? ctx.shake : 0),
    layout.cy + place.y * layout.rowHeight - t.y * back,
  );
  canvas.rotate(place.angle + row.lean, 0, 0);
  canvas.scale(s, s);
  // Centered on its widest: the calculation and the widest answer.
  canvas.translate(-(row.start + layout.end) / 2, digitHeight / 2);
  drawWithAlpha(canvas, place.alpha, () => {
    drawSplash(canvas, row, {
      lit,
      skin,
      t,
      reducedMotion,
      press: isCurrent ? ctx.press : 0,
      flash: isAnswered && row.correct ? ctx.hit.flash : 0,
    });
    drawCalculation(canvas, row, { lit, skin });
    drawAnswer(canvas, row, { lit, skin, hit: isAnswered ? ctx.hit : null, reducedMotion, digitHeight });
    if (isCurrent)
      drawInput(canvas, ctx.run, { skin, reducedMotion, digitHeight });
    drawTag(canvas, row, { lit, skin, digitHeight });
  });
  canvas.restore();
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
