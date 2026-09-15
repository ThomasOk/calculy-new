import type { SharedValue } from 'react-native-reanimated';
import * as React from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  clamp,
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.

export type Tilt = { x: number; y: number };

// Only changes of angle count: the baseline slowly follows the phone, so the
// light moves when the phone moves and settles wherever the user holds it.
// Per sensor sample (~every frame), so about a second to settle at 60Hz.
const BASELINE_FOLLOW = 0.02;
// A change of gravity of 1/SENSOR_GAIN (≈20° of tilt) is a full tilt.
const SENSOR_GAIN = 3;
// A drag this long, in points, is a full tilt. Stands in for the sensor in
// the simulator, and is fun on a device too.
const DRAG_RANGE = 160;
const SNAP_BACK = { duration: 400, dampingRatio: 0.8 };

// Tilt in -1…1 on both axes, from the gravity sensor plus a pan gesture.
// Positive x: the viewer moves right. Positive y: the viewer moves down. If
// the light goes the wrong way on a device, flip the signs in the reaction.
export function useTilt(): { tilt: SharedValue<Tilt>; pan: ReturnType<typeof Gesture.Pan> } {
  const reducedMotion = useReducedMotion();
  const { sensor } = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });
  const baseline = useSharedValue<Tilt | null>(null);
  const sensorTilt = useSharedValue<Tilt>({ x: 0, y: 0 });
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  useAnimatedReaction(
    () => sensor.get(),
    (gravity) => {
      // Reduced motion drops the parallax; the drag stays, the user drives it.
      if (reducedMotion)
        return;
      const length = Math.hypot(gravity.x, gravity.y, gravity.z);
      if (length === 0)
        return;
      const gx = gravity.x / length;
      const gy = gravity.y / length;
      const base = baseline.get();
      if (base === null) {
        baseline.set({ x: gx, y: gy });
        return;
      }
      const next = {
        x: base.x + (gx - base.x) * BASELINE_FOLLOW,
        y: base.y + (gy - base.y) * BASELINE_FOLLOW,
      };
      baseline.set(next);
      sensorTilt.set({
        x: clamp((gx - next.x) * SENSOR_GAIN, -1, 1),
        y: clamp((next.y - gy) * SENSOR_GAIN, -1, 1),
      });
    },
    [reducedMotion],
  );

  const tilt = useDerivedValue(() => ({
    x: clamp(sensorTilt.get().x + dragX.get(), -1, 1),
    y: clamp(sensorTilt.get().y + dragY.get(), -1, 1),
  }));

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          // Grabbed mid snap-back: continue from where it is, not from 0.
          dragStartX.set(dragX.get());
          dragStartY.set(dragY.get());
        })
        .onUpdate((event) => {
          dragX.set(clamp(dragStartX.get() + event.translationX / DRAG_RANGE, -1, 1));
          dragY.set(clamp(dragStartY.get() + event.translationY / DRAG_RANGE, -1, 1));
        })
        .onEnd((event) => {
          dragX.set(withSpring(0, { ...SNAP_BACK, velocity: event.velocityX / DRAG_RANGE }));
          dragY.set(withSpring(0, { ...SNAP_BACK, velocity: event.velocityY / DRAG_RANGE }));
        }),
    [dragX, dragY, dragStartX, dragStartY],
  );

  return { tilt, pan };
}
