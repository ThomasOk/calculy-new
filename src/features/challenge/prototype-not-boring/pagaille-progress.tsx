import type { CSSTransitionProperties } from 'react-native-reanimated';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Pagaille's progress through the run, in place of the header's "1/20": a
// bar across the top, slanted like the results' plates, filling in ink as
// answers come. Glanced at, never read: how full it is says whether the end
// is near, for 20 calculations as for 200 (one mark per calculation turns to
// noise past about 30). A short accent slash at its head, taller than the
// bar, is the calculation being played, as the accent splash is in the
// stack. It doesn't show green or red: the stack already does, right where
// the player is looking, and the results tally them.
// Motion: on each answer the fill and its head move on together, in
// FILL_MS — 20 to 200 times a run, with the eye on the stack, so short and
// with no overshoot. The head shows at the go and leaves once the run is
// over. Reduced motion: the fill steps, the head still fades.

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const SKEW = '-24deg';
const HEIGHT = 8;
// The head: its width, and how far it pokes out above and below the bar.
const HEAD = 10;
const HEAD_OUT = 3;
// The bar's empty part: the skin's muted, this see-through (hex alpha).
const TRACK_ALPHA = '59';
const FILL_MS = 200;
// The fill and its head are absolutely placed with no children: animating
// their width and left lays out nothing else.
const FILL = { transition: `width ${FILL_MS}ms ${EASE_OUT}` } satisfies CSSTransitionProperties;
const HEAD_MOVE = { transition: `left ${FILL_MS}ms ${EASE_OUT}, opacity ${FILL_MS}ms ${EASE_OUT}` } satisfies CSSTransitionProperties;
const HEAD_STILL = { transition: `opacity ${FILL_MS}ms ${EASE_OUT}` } satisfies CSSTransitionProperties;

type Props = {
  total: number;
  // Calculations answered so far.
  done: number;
  // Whether the calculation after them is being played: not during the
  // countdown, nor once the run is over.
  playing: boolean;
  skin: Skin;
};

export function PagailleProgress({ total, done, playing, skin }: Props) {
  const reducedMotion = useReducedMotion();
  const filled: `${number}%` = `${(total > 0 ? Math.min(1, done / total) : 0) * 100}%`;
  return (
    <View
      style={styles.strip}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: done }}
    >
      <View style={[styles.track, { backgroundColor: `${skin.muted}${TRACK_ALPHA}` }]}>
        <Animated.View style={[styles.fill, !reducedMotion && FILL, { width: filled, backgroundColor: skin.ink }]} />
        {/* Its lane stops HEAD short of the end, so the head never runs off
            the bar; it always covers the fill's end. */}
        <View style={styles.headLane}>
          <Animated.View
            style={[
              styles.head,
              reducedMotion ? HEAD_STILL : HEAD_MOVE,
              { left: filled, opacity: playing ? 1 : 0, backgroundColor: skin.accent },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: 20,
    paddingVertical: HEAD_OUT + 1,
    marginBottom: 2,
  },
  // Its children take its slant.
  track: {
    height: HEIGHT,
    transform: [{ skewX: SKEW }],
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  headLane: {
    position: 'absolute',
    top: -HEAD_OUT,
    bottom: -HEAD_OUT,
    left: 0,
    right: HEAD,
  },
  head: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HEAD,
  },
});
