import type { SkCanvas, SkFont, SkPath } from '@shopify/react-native-skia';
import { Skia } from '@shopify/react-native-skia';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Font-units measuring and drawing shared across Pagaille's canvases
// (problem-pagaille.tsx, pagaille-score.tsx): the font is loaded at
// FONT_UNITS, a digit's width and height read from it (textWidth, measure),
// and a picture's alpha faded as one layer rather than glyph by glyph
// (drawWithAlpha), which its splash and its ink both need — separate, the
// paint under the ink would show through.

export const FONT_UNITS = 100;

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

// The digits being typed, laid out by useGlyphSlots: one path per slot, its
// width, its x and how visible it is, 0 to 1.
export type GlyphRun = { paths: (SkPath | null)[]; widths: number[]; xs: number[]; vis: number[] };
