import type { SkCanvas, SkFont, SkPath } from '@shopify/react-native-skia';
import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue, WithTimingConfig } from 'react-native-reanimated';
import type { Hit } from '@/features/challenge/prototype-not-boring/answer-hit';
import type { Box, InkItem } from '@/features/challenge/prototype-not-boring/pagaille-paint';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { LeagueGothic_400Regular } from '@expo-google-fonts/league-gothic';
import { Canvas, ClipOp, createPicture, Picture, Skia, useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { drawSparks, EASE_OUT, popScale } from '@/features/challenge/prototype-not-boring/answer-hit';
import { drawInk, SHEET, SHEET_TILT, splashPaths } from '@/features/challenge/prototype-not-boring/pagaille-paint';
import { ON_SPLASH } from '@/features/challenge/prototype-not-boring/pagaille-style';
import { drawWithAlpha, FONT_UNITS, measure, textWidth } from '@/features/challenge/prototype-not-boring/relief';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Pagaille's score, the results' selected item: the correct answers in the
// ink of an answer (pagaille-paint.ts) on a torn splash of the skin's
// accent, out of the run's count in black, like the operators on the
// current calculation's splash. Timed on the results' sound: the splash is
// brushed on, the score counts up with its run up the Rhodes and hits at
// `landAt`, on its chord, as a correct answer does (answer-hit.ts): it pops,
// holds, the splash flashes white and sparks fly.
// Reduced motion: the splash fades in and the score shows at once; the
// flash stays, the pop and the sparks go.

// The splash beyond the text, in digit heights, as around a calculation.
const SPLASH_LEFT = 0.6;
const SPLASH_RIGHT = 0.45;
const SPLASH_TOP = 0.32;
const SPLASH_BOTTOM = 0.34;
// The run's count: its height, in the score's digit heights, and the gap
// before it, in font units.
const OUT_OF_SIZE = 0.45;
const OUT_OF_GAP = 14;
// Its lean, in degrees, like the current calculation's place.
const LEAN = -6;
// Kept around the splash for its slant, drips and spatter, in digit
// heights; and free at the screen's sides, in points. Spatter may bleed.
const BLEED_X = 0.5;
const BLEED_Y = 0.6;
const EDGE = 12;
// Points per font unit, at most.
const MAX_SCALE = 1.8;
// The splash is brushed on over BRUSH; the count starts COUNT_FROM_MS in.
const BRUSH = { delay: 40, duration: 260 };
const COUNT_FROM_MS = 40;
// On landing, as a correct answer: held HOLD_MS, then settling.
const HOLD_MS = 50;
const POP_BACK: WithTimingConfig = { duration: 240, easing: EASE_OUT };
const FLASH_OUT: WithTimingConfig = { duration: 200, easing: EASE_OUT };
const SPARKS_OUT: WithTimingConfig = { duration: 260, easing: EASE_OUT };
const FADE_IN: WithTimingConfig = { duration: 200, easing: EASE_OUT };
const SPARK_WIDTH = 5;

type Props = {
  correct: number;
  total: number;
  skin: Skin;
  tilt: SharedValue<Tilt>;
  // When the score lands, in ms from the mount.
  landAt: number;
};

export function PagailleScore({ correct, total, skin, tilt, landAt }: Props) {
  const serif = useFont(AbrilFatface_400Regular, FONT_UNITS);
  const gothic = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);
  const reducedMotion = useReducedMotion();
  const art = React.useMemo(
    () => (serif && gothic ? buildArt({ serif, gothic }, { correct, total }) : null),
    [serif, gothic, correct, total],
  );
  const fit = React.useMemo(() => (art && size.width > 0 ? fitArt(art, size) : null), [art, size]);
  const motion = useScoreMotion(correct, { landAt, reducedMotion });

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!art || !fit)
        return;
      canvas.translate(size.width / 2, size.height / 2);
      canvas.rotate(LEAN, 0, 0);
      canvas.scale(fit.k, fit.k);
      canvas.translate(-fit.cx, -fit.cy);
      drawPaint(canvas, art, { brush: motion.brush.get(), flash: motion.flash.get(), skin, t: tilt.get(), reducedMotion });
      drawScore(canvas, art, {
        value: Math.floor(motion.tally.get() + 0.001),
        hit: { pop: motion.pop.get(), flash: 0, sparks: motion.sparks.get() },
        skin,
        reducedMotion,
      });
    });
  }, [art, fit, size, skin, reducedMotion]);

  return (
    <View style={styles.fill} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

// Everything that moves, from the mount: the brush, the count, and the
// landing's pop, flash and sparks.
function useScoreMotion(correct: number, { landAt, reducedMotion }: { landAt: number; reducedMotion: boolean }) {
  const brush = useSharedValue(0);
  const tally = useSharedValue(reducedMotion ? correct : 0);
  const pop = useSharedValue(0);
  const flash = useSharedValue(0);
  const sparks = useSharedValue(1);
  React.useEffect(() => {
    const land = (settle: WithTimingConfig) =>
      withDelay(landAt, withSequence(withTiming(1, { duration: 0 }), withDelay(HOLD_MS, withTiming(0, settle))));
    // Reduced motion keeps the flash: it's light, not movement.
    flash.set(land(FLASH_OUT));
    if (reducedMotion) {
      brush.set(withTiming(1, FADE_IN));
      tally.set(correct);
      return;
    }
    brush.set(withDelay(BRUSH.delay, withTiming(1, { duration: BRUSH.duration, easing: EASE_OUT })));
    // Even steps, like the notes of the run.
    tally.set(withDelay(COUNT_FROM_MS, withTiming(correct, { duration: landAt - COUNT_FROM_MS, easing: Easing.linear })));
    pop.set(land(POP_BACK));
    sparks.set(withDelay(landAt, withSequence(withTiming(0, { duration: 0 }), withTiming(1, SPARKS_OUT))));
  }, [correct, landAt, reducedMotion, brush, tally, pop, flash, sparks]);
  return { brush, tally, pop, flash, sparks };
}

type Fonts = { serif: SkFont; gothic: SkFont };
// The score's pieces, in font units: the score ends at x = 0 and the run's
// count starts OUT_OF_GAP after it, both on the baseline.
type Art = {
  // 0 to 9, to spell the score as it counts up.
  digits: { path: SkPath; width: number }[];
  outOf: SkPath;
  outOfScale: number;
  splash: SkPath;
  splatter: SkPath;
  box: Box;
  digitHeight: number;
};

// Sized for the final score: the count never outgrows it.
function buildArt({ serif, gothic }: Fonts, { correct, total }: { correct: number; total: number }): Art {
  const digits = Array.from({ length: 10 }, (_, n) => ({
    path: Skia.Path.MakeFromText(String(n), 0, 0, serif) ?? Skia.Path.Make(),
    width: textWidth(serif, String(n)),
  }));
  const h = measure(serif).digitHeight;
  const outOfText = `/${total}`;
  const outOfScale = (OUT_OF_SIZE * h) / measure(gothic).digitHeight;
  const scoreWidth = String(correct)
    .split('')
    .reduce((sum, char) => sum + (digits[Number(char)]?.width ?? 0), 0);
  const box = {
    x0: -scoreWidth - SPLASH_LEFT * h,
    x1: OUT_OF_GAP + textWidth(gothic, outOfText) * outOfScale + SPLASH_RIGHT * h,
    y0: -h * (1 + SPLASH_TOP),
    y1: h * SPLASH_BOTTOM,
  };
  return {
    digits,
    outOf: Skia.Path.MakeFromText(outOfText, 0, 0, gothic) ?? Skia.Path.Make(),
    outOfScale,
    ...splashPaths(box, correct + total * 7),
    box,
    digitHeight: h,
  };
}

// As big as the view allows, the splash centered in it.
function fitArt(art: Art, size: { width: number; height: number }) {
  const h = art.digitHeight;
  const { box } = art;
  const across = box.x1 - box.x0 + BLEED_X * h * 2;
  const down = box.y1 - box.y0 + BLEED_Y * h * 2;
  return {
    k: Math.min((size.width - EDGE * 2) / across, size.height / down, MAX_SCALE),
    cx: (box.x0 + box.x1) / 2,
    cy: (box.y0 + box.y1) / 2,
  };
}

// The worklets below must stay in this order: a worklet captures the
// functions it calls when its definition runs (see problem-pagaille.tsx).

type PaintLook = { brush: number; flash: number; skin: Skin; t: Tilt; reducedMotion: boolean };

// The splash brushed on from the left over its white sheet, as the current
// calculation's; flashing white as the score lands.
function drawPaint(canvas: SkCanvas, art: Art, look: PaintLook) {
  'worklet';
  const { brush, skin, t } = look;
  if (brush < 0.01)
    return;
  const { box } = art;
  canvas.save();
  const brushed = !look.reducedMotion && brush < 0.999;
  if (brushed) {
    const h = box.y1 - box.y0;
    const reach = box.x1 - box.x0 + h * 3;
    canvas.clipRect(Skia.XYWHRect(box.x0 - h * 1.5, box.y0 - h * 2, reach * brush, h * 5), ClipOp.Intersect, true);
  }
  drawWithAlpha(canvas, brushed ? 1 : brush, () => {
    const sheet = Skia.Paint();
    sheet.setAntiAlias(true);
    sheet.setColor(Skia.Color(skin.ink));
    canvas.save();
    canvas.translate(SHEET.x - t.x * SHEET_TILT, SHEET.y - t.y * SHEET_TILT);
    canvas.drawPath(art.splash, sheet);
    canvas.restore();
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color(skin.accent));
    canvas.drawPath(art.splash, paint);
    canvas.drawPath(art.splatter, paint);
    if (look.flash > 0.01) {
      sheet.setAlphaf(look.flash);
      canvas.drawPath(art.splash, sheet);
    }
  });
  canvas.restore();
}

type ScoreLook = { value: number; hit: Hit; skin: Skin; reducedMotion: boolean };

// The score so far, right-aligned on 0, then the run's count.
function drawScore(canvas: SkCanvas, art: Art, look: ScoreLook) {
  'worklet';
  const h = art.digitHeight;
  const chars = String(look.value).split('');
  let width = 0;
  for (const char of chars)
    width += art.digits[Number(char)]?.width ?? 0;
  const scale = popScale(look.hit, { correct: true, reducedMotion: look.reducedMotion });
  const items: InkItem[] = [];
  let x = -width;
  for (const char of chars) {
    const digit = art.digits[Number(char)];
    if (!digit)
      continue;
    items.push({ path: digit.path, x, width: digit.width, scale, alpha: 1 });
    x += digit.width;
  }
  drawInk(canvas, items, { fill: Skia.Color(look.skin.ink), digitHeight: h });

  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(ON_SPLASH));
  canvas.save();
  canvas.translate(OUT_OF_GAP, 0);
  canvas.scale(art.outOfScale, art.outOfScale);
  canvas.drawPath(art.outOf, paint);
  canvas.restore();

  if (look.reducedMotion)
    return;
  drawSparks(
    canvas,
    { cx: -width / 2, cy: -h / 2, rx: width / 2, ry: h / 2, digitHeight: h },
    { progress: look.hit.sparks, seed: 5, color: look.skin.ink, width: SPARK_WIDTH },
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
