import type { CSSAnimationProperties } from 'react-native-reanimated';
import * as React from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { ENGRAVED_TEXT, GLOSS_INK } from '@/features/challenge/components/gloss-styles';
import { DIGITS_FONT } from '@/features/challenge/typography';

const COUNT_FROM = 3;
const STEP_MS = 1000;
// Reanimated takes a cubicBezier() object here, but React Native's style types
// only accept a string, and a 'cubic-bezier()' string is only parsed inside the
// `transition` shorthand. The cast is for RN's types alone.
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1) as unknown as 'ease-out';

// Each number lives exactly one step: it grows in from just behind the screen
// (250ms), holds, then keeps growing as it fades (200ms), so the next one
// seems to follow it through. The curve applies to each segment on its own,
// so the entrance and the exit are both ease-out. Fill mode `both` holds the
// faded last frame until the next number replaces it: without it the old
// number flashes back for a frame.
const TICK = {
  animationName: {
    '0%': { opacity: 0, transform: [{ scale: 0.9 }] },
    '25%': { opacity: 1, transform: [{ scale: 1 }] },
    '80%': { opacity: 1, transform: [{ scale: 1 }] },
    '100%': { opacity: 0, transform: [{ scale: 1.1 }] },
  },
  animationDuration: `${STEP_MS}ms`,
  animationTimingFunction: EASE_OUT,
  animationFillMode: 'both',
} satisfies CSSAnimationProperties;

// Reduced motion keeps the fades, which carry the rhythm, and drops the scale.
const TICK_REDUCED = {
  ...TICK,
  animationName: {
    '0%': { opacity: 0 },
    '25%': { opacity: 1 },
    '80%': { opacity: 1 },
    '100%': { opacity: 0 },
  },
} satisfies CSSAnimationProperties;

type Props = {
  // Called once the last number has faded out. Keep it stable: a new function
  // restarts the current step.
  onDone: () => void;
};

// 3, 2, 1, one per second, then onDone.
export function ChallengeCountdown({ onDone }: Props) {
  const reducedMotion = useReducedMotion();
  const [count, setCount] = React.useState(COUNT_FROM);

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(String(count));
    const timeout = setTimeout(() => {
      if (count > 1)
        setCount(count - 1);
      else
        onDone();
    }, STEP_MS);
    return () => clearTimeout(timeout);
  }, [count, onDone]);

  return (
    <View testID="challenge-countdown" pointerEvents="none" style={styles.overlay}>
      {/* Keyed so each number mounts and plays its own animation. */}
      <Animated.Text
        key={count}
        style={[DIGITS_FONT, ENGRAVED_TEXT, styles.digit, reducedMotion ? TICK_REDUCED : TICK]}
      >
        {count}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 128,
    lineHeight: 160,
    fontVariant: ['tabular-nums'],
    color: GLOSS_INK,
  },
});
