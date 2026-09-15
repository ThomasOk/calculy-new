import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Text } from '@/components/ui';
import { digitRise, fadeIn, GOTHIC, SKEW, stampIn } from '@/features/challenge/prototype-not-boring/pagaille-style';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Pagaille's countdown: 3, 2, 1 on a slanted black plate over its accent
// shadow, as the menus' plates (pagaille-menu.tsx), leaning. Each number is
// stamped down with its plate as it shows, with its finger snap
// (use-countdown-sounds.ts). No go on screen: after the 1, the plate is gone
// and the calculations spin in straight away.
// Reduced motion: each number fades in.

const SIZE = 180;
const LEAN = '-6deg';
const SHADOW_OFFSET = 8;
const MIN_WIDTH = 120;

// Built once: a new keyframes object on a re-render could replay the entrance.
const STAMP = stampIn(0);
const STAMP_STILL = fadeIn(0);

type Props = {
  // 3, 2, 1 as they're counted; 0 before the count starts, and from the go.
  count: number;
  skin: Skin;
};

export function PagailleCountdown({ count, skin }: Props) {
  const reducedMotion = useReducedMotion();
  if (count <= 0)
    return null;
  return (
    <View
      style={styles.stage}
      pointerEvents="none"
      // Announced by the countdown itself (not-boring-challenge.tsx).
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Its lean on the outside, so the stamp's scale doesn't replace it. */}
      <View style={styles.lean}>
        {/* Keyed on the count: each number mounts anew, and is stamped down. */}
        <Animated.View key={count} style={reducedMotion ? STAMP_STILL : STAMP}>
          <View style={[styles.plate, styles.shadow, { backgroundColor: skin.accent }]} />
          <View style={[styles.plate, styles.ink]} />
          <Text style={[GOTHIC, styles.number, { color: skin.ink }]}>{count}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lean: {
    transform: [{ rotate: LEAN }],
  },
  plate: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ skewX: SKEW }],
  },
  shadow: {
    transform: [{ translateX: SHADOW_OFFSET }, { translateY: SHADOW_OFFSET }, { skewX: SKEW }],
  },
  ink: {
    backgroundColor: '#000000',
  },
  number: {
    minWidth: MIN_WIDTH,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 26,
    fontSize: SIZE,
    lineHeight: SIZE,
    marginBottom: digitRise(SIZE),
    textAlign: 'center',
    includeFontPadding: false,
  },
});
