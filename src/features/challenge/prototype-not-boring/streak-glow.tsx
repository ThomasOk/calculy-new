import type { SkPoint } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { NumberBox } from '@/features/challenge/prototype-not-boring/streak-rays';
import { Canvas, Circle, Group, RadialGradient, vec } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// "Éclair puis veilleuse" from the streak bench: a warm glow behind the giant
// number while a streak lasts (streak.ts). It comes on at the first
// milestone and steps up at each next one; each milestone also flashes it,
// together with the speed lines. A mistake puts it out at once, with the red.
// Drawn behind everything, over the background only.

// The glow's radius, as a share of the number's box width.
const RADIUS = 0.56;
const GRADIENT_STOPS = [0, 0.45, 1];
// The level that stays, from the first milestone to the last.
const REST_MIN = 0.25;
const REST_SPAN = 0.5;
const SCALE_MIN = 0.8;
const SCALE_SPAN = 0.4;
const STEP_MS = 340;
// A mistake puts it out this fast, as the red comes.
const OUT_MS = 120;
// The flash on each milestone, on top of the level.
const FLASH_MIN = 0.5;
const FLASH_SPAN = 0.3;
const FLASH_IN_MS = 80;
const FLASH_OUT_MS = 570;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export type GlowFlash = { id: number; level: number };

type Props = {
  // Milestones reached, 0 outside a streak, out of `levels`.
  level: number;
  levels: number;
  // A new flash lights the glow up once.
  flash: GlowFlash | null;
  box: NumberBox | null;
  color: string;
};

export function StreakGlow({ level, levels, flash, box, color }: Props) {
  const reducedMotion = useReducedMotion();
  const restOpacity = useSharedValue(0);
  const restScale = useSharedValue(SCALE_MIN);
  const flashOpacity = useSharedValue(0);
  const flashScale = useSharedValue(1);

  React.useEffect(() => {
    const t = depth(level, levels);
    const timing = { duration: level > 0 ? STEP_MS : OUT_MS, easing: EASE_OUT };
    restOpacity.set(withTiming(level > 0 ? REST_MIN + REST_SPAN * t : 0, timing));
    restScale.set(withTiming(SCALE_MIN + SCALE_SPAN * t, timing));
  }, [level, levels, restOpacity, restScale]);

  React.useEffect(() => {
    if (!flash)
      return;
    const t = depth(flash.level, levels);
    const size = 0.95 + 0.3 * t;
    flashOpacity.set(withSequence(
      withTiming(FLASH_MIN + FLASH_SPAN * t, { duration: FLASH_IN_MS }),
      withTiming(0, { duration: FLASH_OUT_MS, easing: Easing.out(Easing.quad) }),
    ));
    // Reduced motion keeps the light and drops the swell.
    if (reducedMotion) {
      flashScale.set(size);
      return;
    }
    flashScale.set(withSequence(
      withTiming(size * 0.85, { duration: 0 }),
      withTiming(size, { duration: FLASH_IN_MS }),
      withTiming(size * 1.05, { duration: FLASH_OUT_MS }),
    ));
  }, [flash, levels, reducedMotion, flashOpacity, flashScale]);

  if (!box)
    return null;
  const center = vec(box.x + box.width / 2, box.y + box.height / 2);
  const radius = box.width * RADIUS;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <GlowLayer center={center} radius={radius} color={color} opacity={restOpacity} scale={restScale} />
        <GlowLayer center={center} radius={radius} color={color} opacity={flashOpacity} scale={flashScale} />
      </Canvas>
    </View>
  );
}

// 0 at the first milestone, 1 at the last.
function depth(level: number, levels: number) {
  return levels > 1 ? Math.min(Math.max((level - 1) / (levels - 1), 0), 1) : 1;
}

type LayerProps = {
  center: SkPoint;
  radius: number;
  color: string;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
};

function GlowLayer({ center, radius, color, opacity, scale }: LayerProps) {
  const transform = useDerivedValue(() => [{ scale: scale.get() }]);
  const colors = React.useMemo(() => [withAlpha(color, 0.72), withAlpha(color, 0.24), withAlpha(color, 0)], [color]);
  return (
    <Group opacity={opacity} transform={transform} origin={center}>
      <Circle c={center} r={radius}>
        <RadialGradient c={center} r={radius} colors={colors} positions={GRADIENT_STOPS} />
      </Circle>
    </Group>
  );
}

// '#RRGGBB' with an alpha, as Skia reads it.
function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
