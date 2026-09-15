import type { CSSTransitionProperties } from 'react-native-reanimated';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { View } from '@/components/ui';
import { GLOSS_PROGRESS_FILL, GLOSS_PROGRESS_TRACK } from '@/features/challenge/components/gloss-styles';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const TRACK_HEIGHT = 6;
// Fires once per confirmed answer: fast enough to feel tied to the tap that
// caused it, slow enough to read as a fill rather than a jump. Always on,
// reduced motion included — the fill states the run's actual progress, it
// doesn't just decorate the change.
const FILL_TRANSITION = {
  transition: `width 250ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;

type Props = {
  current: number;
  total: number;
};

// How far through the run the user is, filling left to right as answers are
// confirmed. Kept out of the gloss recipe (gloss.tsx): at 6px tall, a rim and
// a highlight would just read as noise.
export function ChallengeProgress({ current, total }: Props) {
  const progress = total > 0 ? Math.min(1, current / total) : 0;
  return (
    <View
      className="pb-3"
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      <View style={styles.track}>
        {/* Absolutely positioned with no children: the one case where
            animating `width` is free, because nothing else re-lays-out. */}
        <Animated.View style={[styles.fill, FILL_TRANSITION, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: GLOSS_PROGRESS_TRACK,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: GLOSS_PROGRESS_FILL,
  },
});
