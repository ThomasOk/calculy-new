import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { LeagueGothic_400Regular } from '@expo-google-fonts/league-gothic';
import { Canvas, createPicture, Picture, Skia, useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  DEPTH,
  drawSides,
  drawTint,
  drawWithAlpha,
  DROP,
  extrusion,
  faceShader,
  FONT_UNITS,
  measure,
  placeGlyph,
  usePaints,
} from '@/features/challenge/prototype-not-boring/relief';
import { MAX_SLOTS, useGlyphSlots } from '@/features/challenge/prototype-not-boring/use-glyph-slots';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
// One big number in relief (relief.ts), its digits dropping in as they come.

const SHAKE_STEP = { duration: 40 };

export type NumberFeedback = { id: number; correct: boolean };

type Props = {
  value: string;
  skin: Skin;
  tilt: SharedValue<Tilt>;
  // A new id flashes the face green or red; red also shakes.
  feedback?: NumberFeedback | null;
  // How many digits must fit across: the size doesn't change as digits come.
  fitChars?: number;
};

export function ExtrudedNumber({ value, skin, tilt, feedback, fitChars = 4 }: Props) {
  const font = useFont(LeagueGothic_400Regular, FONT_UNITS);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const slots = useGlyphSlots(font, value, { align: 'center' });
  const { tint, shake } = useFeedback(feedback);
  const metrics = React.useMemo(() => (font ? measure(font) : null), [font]);
  const paints = usePaints(skin);

  const scale = metrics && size.width > 0
    ? Math.min(
        size.width / (fitChars * metrics.digitWidth + DEPTH * 3),
        size.height / (metrics.digitHeight + DEPTH * 2 + DROP),
      )
    : 0;

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      if (!metrics || scale === 0)
        return;
      const t = tilt.get();
      const { dx, dy } = extrusion(t, DEPTH);
      const paths = slots.paths.get();
      const widths = slots.widths.get();
      const xs = slots.xs.get();
      const vis = slots.vis.get();
      const tintValue = tint.get();

      canvas.translate(size.width / 2 + shake.get(), size.height / 2);
      canvas.scale(scale, scale);
      // Center the digit and its extrusion together.
      canvas.translate(-dx / 2, metrics.digitHeight / 2 - dy / 2);

      // Painter's order: with the sides going left, a digit's sides reach
      // under its left neighbour, so draw right to left, and the reverse.
      const order: number[] = [];
      for (let i = 0; i < MAX_SLOTS; i++)
        order.push(dx < 0 ? MAX_SLOTS - 1 - i : i);

      // Shadows and glows first: they sit behind every digit.
      for (const i of order) {
        const path = paths[i];
        const v = vis[i] ?? 0;
        if (!path || v < 0.01)
          continue;
        canvas.save();
        placeGlyph(canvas, { x: xs[i] ?? 0, width: widths[i] ?? 0, v }, metrics.digitHeight);
        if (paints.glow)
          drawWithAlpha(canvas, v, () => canvas.drawPath(path, paints.glow!));
        canvas.save();
        canvas.translate(dx * 1.4 + 2, dy * 1.4 + 6);
        drawWithAlpha(canvas, v, () => canvas.drawPath(path, paints.shadow));
        canvas.restore();
        canvas.restore();
      }

      for (const i of order) {
        const path = paths[i];
        const v = vis[i] ?? 0;
        if (!path || v < 0.01)
          continue;
        const x = xs[i] ?? 0;
        const width = widths[i] ?? 0;
        canvas.save();
        placeGlyph(canvas, { x, width, v }, metrics.digitHeight);
        drawWithAlpha(canvas, v, () => {
          drawSides(canvas, path, { dx, dy, sides: paints.sides });
          const face = Skia.Paint();
          face.setAntiAlias(true);
          face.setShader(faceShader(skin, t, {
            x,
            width,
            digitHeight: metrics.digitHeight,
            span: fitChars * metrics.digitWidth,
          }));
          canvas.drawPath(path, face);
          canvas.drawPath(path, paints.edge);
          drawTint(canvas, path, { tint: tintValue, skin });
        });
        canvas.restore();
      }
    });
  }, [metrics, scale, size, paints, skin, fitChars]);

  return (
    <View style={styles.fill} onLayout={onLayout} accessible accessibilityRole="text" accessibilityLabel={value}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

function useFeedback(feedback: NumberFeedback | null | undefined) {
  const reducedMotion = useReducedMotion();
  const tint = useSharedValue(0);
  const shake = useSharedValue(0);

  React.useEffect(() => {
    if (!feedback)
      return;
    tint.set(withSequence(
      withTiming(feedback.correct ? 1 : -1, { duration: 80 }),
      withDelay(220, withTiming(0, { duration: 200 })),
    ));
    // Reduced motion keeps the color, which carries the answer, and drops the
    // shake.
    if (!feedback.correct && !reducedMotion) {
      shake.set(withSequence(
        withTiming(-8, SHAKE_STEP),
        withTiming(8, SHAKE_STEP),
        withTiming(-5, SHAKE_STEP),
        withTiming(3, SHAKE_STEP),
        withTiming(0, SHAKE_STEP),
      ));
    }
  }, [feedback, reducedMotion, tint, shake]);

  return { tint, shake };
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
