import type { SkPath } from '@shopify/react-native-skia';
import type { LayoutChangeEvent } from 'react-native';
import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// "Traits de vitesse" from the streak bench: at each milestone of a streak
// (streak.ts), thin pointed lines aim at the giant number from beyond the
// screen's edges, as in a manga, over everything, keypad included. Three
// random layouts of FRAME_MS each, then the last one fades. More lines at each
// next milestone. Nothing blocks the keys: the next answer can be typed
// through them.
// Reduced motion skips them: the sound and the green still say it.

const FRAME_MS = 60;
const FRAMES = 3;
const FADE_MS = 120;
const TOTAL_MS = FRAME_MS * FRAMES + FADE_MS;
// Lines at the first milestone, COUNT_STEP more at each next one, up to
// MAX_LEVEL steps more.
const BASE_COUNT = 9;
const COUNT_STEP = 3;
const MAX_LEVEL = 2;
// The calculations' half-height, as a share of the box's width: roughly
// what two digits take across it.
const NUMBER_RADIUS = 0.22;
// A line's point stops this far beyond the number's edge, plus up to SPREAD.
const GAP = 24;
const SPREAD = 110;
// A line's width where it leaves the screen, in points.
const MIN_WIDTH = 1.6;
const WIDTH_SPREAD = 3.6;

// level: the milestones reached, from 1.
export type RaysBurst = { id: number; level: number };
// The giant number's box, in the screen's points.
export type NumberBox = { x: number; y: number; width: number; height: number };

type Props = {
  // A new burst draws the lines once.
  burst: RaysBurst | null;
  box: NumberBox | null;
  color: string;
};

export function StreakRays({ burst, box, color }: Props) {
  const reducedMotion = useReducedMotion();
  const [reach, setReach] = React.useState(0);
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    // Past the far corner, wherever the number is.
    setReach(Math.hypot(width, height));
  }, []);
  const elapsed = useSharedValue(TOTAL_MS);

  // New random layouts for each burst.
  const frames = React.useMemo(
    () => (burst && box && reach > 0
      ? buildFrames(box, reach, Math.min(burst.level - 1, MAX_LEVEL))
      : []),
    [burst, box, reach],
  );

  React.useEffect(() => {
    if (!burst || reducedMotion)
      return;
    elapsed.set(withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(TOTAL_MS, { duration: TOTAL_MS, easing: Easing.linear }),
    ));
  }, [burst, reducedMotion, elapsed]);

  const picture = useDerivedValue(() => {
    return createPicture((canvas) => {
      const t = elapsed.get();
      const path = frames[Math.min(FRAMES - 1, Math.floor(t / FRAME_MS))];
      if (!path || t >= TOTAL_MS)
        return;
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color(color));
      paint.setAlphaf(t < FRAME_MS * FRAMES ? 1 : 1 - (t - FRAME_MS * FRAMES) / FADE_MS);
      canvas.drawPath(path, paint);
    });
  }, [frames, color]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

// FRAMES paths, each holding every line of one layout: a thin triangle from
// its point near the number to its base past the screen's edge.
function buildFrames(box: NumberBox, reach: number, level: number): SkPath[] {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rx = box.width * NUMBER_RADIUS;
  const ry = Math.min(rx, box.height / 2);
  const count = BASE_COUNT + COUNT_STEP * level;
  return Array.from({ length: FRAMES }, () => {
    const path = Skia.Path.Make();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // From the center to the ellipse around the number, along the line.
      const edge = (rx * ry) / Math.hypot(ry * cos, rx * sin);
      const inner = edge + GAP + Math.random() * SPREAD;
      const half = (MIN_WIDTH + Math.random() * WIDTH_SPREAD) / 2;
      path.moveTo(cx + cos * inner, cy + sin * inner);
      path.lineTo(cx + cos * reach - sin * half, cy + sin * reach + cos * half);
      path.lineTo(cx + cos * reach + sin * half, cy + sin * reach - cos * half);
      path.close();
    }
    return path;
  });
}
