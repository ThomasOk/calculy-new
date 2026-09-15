import type { SkCanvas, SkFont, SkPaint, SkPath } from '@shopify/react-native-skia';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { BlurStyle, PaintStyle, Skia, TileMode } from '@shopify/react-native-skia';
import * as React from 'react';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// The fake-3D recipe shared by the big number and the problem roll, drawn with
// Skia on the UI thread: a text outline stacked LAYERS times along the
// extrusion vector (the sides), then drawn once more with a lit gradient (the
// face). The tilt moves the extrusion vector and the light together.
//
// Everything is in font units: the font is loaded at FONT_UNITS and each
// picture is scaled to fit its view.

export const FONT_UNITS = 100;
export const LAYERS = 32;
export const DEPTH = 10;
// Resting camera above and to the right: the sides show below-left, as in
// Not Boring's screenshots.
const BASE_DIR = { x: -0.45, y: 0.9 };
const TILT_SWING = 1;
// A digit comes in from this far above, scaled from ENTER_SCALE, and leaves
// the same way.
export const DROP = 16;
const ENTER_SCALE = 0.9;

// Where the back of an extrusion `depth` deep sits, relative to its face.
export function extrusion(t: Tilt, depth: number) {
  'worklet';
  return {
    dx: (BASE_DIR.x - t.x * TILT_SWING) * depth,
    dy: (BASE_DIR.y - t.y * TILT_SWING) * depth,
  };
}

export function textWidth(font: SkFont, text: string) {
  'worklet';
  return font.getGlyphWidths(font.getGlyphIDs(text)).reduce((sum, width) => sum + width, 0);
}

export function measure(font: SkFont) {
  const zero = Skia.Path.MakeFromText('0', 0, 0, font);
  const bounds = zero?.computeTightBounds();
  const [eight] = font.getGlyphWidths(font.getGlyphIDs('8'));
  return {
    digitHeight: bounds?.height ?? FONT_UNITS * 0.7,
    digitWidth: eight ?? FONT_UNITS * 0.4,
  };
}

// The outline stacked LAYERS times, from the back of the extrusion to just
// under the face.
export function drawSides(
  canvas: SkCanvas,
  path: SkPath,
  { dx, dy, sides }: { dx: number; dy: number; sides: SkPaint[] },
) {
  'worklet';
  canvas.save();
  canvas.translate(dx, dy);
  for (let layer = LAYERS - 1; layer >= 0; layer--) {
    canvas.drawPath(path, sides[layer]!);
    canvas.translate(-dx / LAYERS, -dy / LAYERS);
  }
  canvas.restore();
}

// The answer's green or red, laid over the face. tint is 1 for correct, -1
// for wrong, 0 for none.
export function drawTint(canvas: SkCanvas, path: SkPath, { tint, skin }: { tint: number; skin: Skin }) {
  'worklet';
  if (Math.abs(tint) <= 0.01)
    return;
  const overlay = Skia.Paint();
  overlay.setAntiAlias(true);
  overlay.setColor(Skia.Color(tint > 0 ? skin.correct : skin.wrong));
  overlay.setAlphaf(Math.abs(tint) * 0.85);
  canvas.drawPath(path, overlay);
}

// Moves the canvas to a digit's slot and plays its entrance: v is 0 before it
// arrives (or after it left), 1 in place.
export function placeGlyph(
  canvas: SkCanvas,
  { x, width, v }: { x: number; width: number; v: number },
  digitHeight: number,
) {
  'worklet';
  canvas.translate(x, -(1 - v) * DROP);
  const s = ENTER_SCALE + (1 - ENTER_SCALE) * v;
  canvas.translate(width / 2, -digitHeight / 2);
  canvas.scale(s, s);
  canvas.translate(-width / 2, digitHeight / 2);
}

// Sides and face must fade as one: faded separately, the sides would show
// through the face.
export function drawWithAlpha(canvas: SkCanvas, alpha: number, draw: () => void) {
  'worklet';
  if (alpha >= 0.99) {
    draw();
    return;
  }
  const layer = Skia.Paint();
  layer.setAlphaf(alpha);
  canvas.saveLayer(layer);
  draw();
  canvas.restore();
}

type GlyphBox = { x: number; width: number; digitHeight: number; span: number };

export function faceShader(skin: Skin, t: Tilt, { x, width, digitHeight, span }: GlyphBox) {
  'worklet';
  const colors = skin.face.map(color => Skia.Color(color));
  if (skin.faceMode === 'light') {
    // Each shape lit on its own, from above and towards the viewer.
    const lx = (0.35 + t.x * 0.8) * digitHeight * 0.6;
    const ly = (-1 + t.y * 0.6) * digitHeight * 0.6;
    const cx = width / 2;
    const cy = -digitHeight / 2;
    return Skia.Shader.MakeLinearGradient(
      { x: cx + lx, y: cy + ly },
      { x: cx - lx, y: cy - ly },
      colors,
      null,
      TileMode.Clamp,
    );
  }
  // One band pattern across the whole text, offset by the shape's position so
  // the bands run on from one shape to the next, sliding with the tilt.
  const shift = t.x * span * 0.8;
  return Skia.Shader.MakeLinearGradient(
    { x: -span / 2 + shift - x, y: -digitHeight + t.y * digitHeight * 0.5 },
    { x: span / 2 + shift - x, y: t.y * digitHeight * 0.5 },
    colors,
    null,
    TileMode.Mirror,
  );
}

export type GlyphRun = { paths: (SkPath | null)[]; widths: number[]; xs: number[]; vis: number[] };
type RunStyle = { t: Tilt; skin: Skin; paints: ReliefPaints; digitHeight: number; span: number };

// Glyphs laid out by useGlyphSlots, in relief at full DEPTH: every shadow and
// glow first, then each glyph's sides and face. Draws from the canvas's
// current origin, at the text's baseline, in font units. Defined after the
// worklets it calls: see problem-roll.tsx.
export function drawGlyphRun(canvas: SkCanvas, run: GlyphRun, style: RunStyle) {
  'worklet';
  const { dx, dy } = extrusion(style.t, DEPTH);
  const { paints, digitHeight } = style;
  const count = run.paths.length;
  // Painter's order: with the sides going left, a glyph's sides reach under
  // its left neighbour, so draw right to left, and the reverse.
  const order: number[] = [];
  for (let n = 0; n < count; n++)
    order.push(dx < 0 ? count - 1 - n : n);

  for (const i of order) {
    const path = run.paths[i];
    const v = run.vis[i] ?? 0;
    if (!path || v < 0.01)
      continue;
    canvas.save();
    placeGlyph(canvas, { x: run.xs[i] ?? 0, width: run.widths[i] ?? 0, v }, digitHeight);
    const glow = paints.glow;
    if (glow)
      drawWithAlpha(canvas, v, () => canvas.drawPath(path, glow));
    canvas.translate(dx * 1.4 + 2, dy * 1.4 + 6);
    drawWithAlpha(canvas, v, () => canvas.drawPath(path, paints.shadow));
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
    placeGlyph(canvas, { x, width, v }, digitHeight);
    drawWithAlpha(canvas, v, () => {
      drawSides(canvas, path, { dx, dy, sides: paints.sides });
      const face = Skia.Paint();
      face.setAntiAlias(true);
      face.setShader(faceShader(style.skin, style.t, { x, width, digitHeight, span: style.span }));
      canvas.drawPath(path, face);
      canvas.drawPath(path, paints.edge);
    });
    canvas.restore();
  }
}

export type ReliefPaints = ReturnType<typeof usePaints>;

// Built once per skin on the JS thread; the pictures only read them.
export function usePaints(skin: Skin) {
  return React.useMemo(() => {
    const sides = Array.from({ length: LAYERS }, (_, layer) => {
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      // Layer 0 sits right under the face, LAYERS - 1 furthest back.
      paint.setColor(Skia.Color(mixHex(skin.sideFront, skin.sideBack, layer / (LAYERS - 1))));
      return paint;
    });

    const edge = Skia.Paint();
    edge.setAntiAlias(true);
    edge.setStyle(PaintStyle.Stroke);
    edge.setStrokeWidth(0.8);
    edge.setColor(Skia.Color(skin.edge));

    const shadow = Skia.Paint();
    shadow.setColor(Skia.Color(skin.shadow));
    shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 6, true));

    let glow = null;
    if (skin.glow) {
      glow = Skia.Paint();
      glow.setColor(Skia.Color(skin.glow));
      glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 14, true));
    }

    return { sides, edge, shadow, glow };
  }, [skin]);
}

export function mixHex(from: string, to: string, amount: number) {
  const a = Number.parseInt(from.slice(1), 16);
  const b = Number.parseInt(to.slice(1), 16);
  const channel = (shift: number) => {
    const start = (a >> shift) & 0xFF;
    const end = (b >> shift) & 0xFF;
    return Math.round(start + (end - start) * amount);
  };
  const mixed = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${mixed.toString(16).padStart(6, '0')}`;
}
