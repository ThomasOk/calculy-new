import type { SkCanvas, SkColor, SkPath } from '@shopify/react-native-skia';
import { PaintStyle, Skia, StrokeJoin } from '@shopify/react-native-skia';
import { noise, wobble } from '@/features/challenge/prototype-not-boring/pagaille-style';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Pagaille's paint and ink, shared by the calculations (problem-pagaille.tsx),
// the countdown (pagaille-countdown.tsx) and the score (pagaille-score.tsx):
// the torn splash of paint with its drips and spatter, the white sheet
// peeking out from under it, and the white digits with a hard black outline
// and shadow. In font units, like everything Pagaille draws. Its look
// without Skia — faces, text on the paint, seeded mess — is in
// pagaille-style.ts.

// The splash's top edge leans right of its bottom one, by SPLASH_SKEW of its
// height, and its edges are torn by up to SPLASH_JAG of it.
const SPLASH_SKEW = 0.35;
const SPLASH_JAG = 0.12;
const SPLASH_STEPS = 6;
const DRIPS = 2;
const SPLATTER = 4;
// The white sheet under the paint, and how far it slides with the tilt.
export const SHEET = { x: -8, y: 9 };
export const SHEET_TILT = 5;
// The ink's outline and hard shadow.
const OUTLINE = 9;
const HARD_SHADOW = { x: 4, y: 6 };

export type Box = { x0: number; x1: number; y0: number; y1: number };
// A glyph's ink: from its left edge and baseline, grown about its middle.
export type InkItem = { path: SkPath; x: number; width: number; scale: number; alpha: number };

// A torn, slanted splash of paint around `box`, with drips hanging from it
// and spatter beyond its ends. Different for each seed.
export function splashPaths(box: Box, seed: number) {
  const h = box.y1 - box.y0;
  const skew = h * SPLASH_SKEW;
  const jag = (n: number) => wobble(seed * 31 + n) * h * SPLASH_JAG;
  const across = box.x1 - box.x0;
  const splash = Skia.Path.Make();
  splash.moveTo(box.x0 + skew / 2 - h * 0.25, box.y0 + h * 0.2);
  for (let i = 0; i <= SPLASH_STEPS; i++)
    splash.lineTo(box.x0 + skew / 2 + (across * i) / SPLASH_STEPS, box.y0 + jag(i));
  splash.lineTo(box.x1 + skew / 2 + h * 0.3, box.y0 + h * 0.45 + jag(20));
  for (let i = SPLASH_STEPS; i >= 0; i--)
    splash.lineTo(box.x0 - skew / 2 + (across * i) / SPLASH_STEPS, box.y1 + jag(i + 10));
  splash.lineTo(box.x0 - skew / 2 - h * 0.35, box.y1 - h * 0.15);
  splash.lineTo(box.x0 - h * 0.05, box.y0 + h * 0.55);
  splash.close();

  const splatter = Skia.Path.Make();
  for (let i = 0; i < DRIPS; i++) {
    const x = box.x0 - skew / 2 + across * (0.15 + 0.7 * noise(seed * 7 + i));
    const length = h * (0.15 + 0.35 * noise(seed * 11 + i));
    const width = h * (0.04 + 0.04 * noise(seed * 13 + i));
    splatter.addRRect(Skia.RRectXY(Skia.XYWHRect(x - width / 2, box.y1 - width, width, length + width), width / 2, width / 2));
    splatter.addCircle(x, box.y1 + length, width * 0.9);
  }
  for (let i = 0; i < SPLATTER; i++) {
    const out = h * (0.45 + 0.5 * noise(seed * 17 + i));
    const x = i % 2 === 0 ? box.x1 + skew / 2 + out : box.x0 - skew / 2 - out;
    splatter.addCircle(x, box.y0 + h * noise(seed * 19 + i), h * (0.03 + 0.06 * noise(seed * 23 + i)));
  }
  return { splash, splatter };
}

// White digits with a black outline and a hard black shadow, Persona style:
// they read on the paint and on the page. Each pass over all the digits,
// so an outline never covers the next digit's face.
export function drawInk(canvas: SkCanvas, items: InkItem[], style: { fill: SkColor; digitHeight: number }) {
  'worklet';
  const black = Skia.Paint();
  black.setAntiAlias(true);
  black.setColor(Skia.Color('#000000'));
  const outline = black.copy();
  outline.setStyle(PaintStyle.Stroke);
  outline.setStrokeWidth(OUTLINE);
  outline.setStrokeJoin(StrokeJoin.Round);
  const face = Skia.Paint();
  face.setAntiAlias(true);
  face.setColor(style.fill);
  const h = style.digitHeight;
  for (let pass = 0; pass < 3; pass++) {
    for (const item of items) {
      if (item.alpha < 0.01)
        continue;
      canvas.save();
      canvas.translate(item.x + item.width / 2, -h / 2);
      canvas.scale(item.scale, item.scale);
      canvas.translate(-item.width / 2, h / 2);
      if (pass === 0) {
        canvas.translate(HARD_SHADOW.x, HARD_SHADOW.y);
        black.setAlphaf(item.alpha);
        canvas.drawPath(item.path, black);
      }
      const paint = pass === 2 ? face : outline;
      paint.setAlphaf(item.alpha);
      canvas.drawPath(item.path, paint);
      canvas.restore();
    }
  }
}
