import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Text } from '@/components/ui';
import {
  digitRise,
  fadeIn,
  GOTHIC,
  ON_SPLASH,
  SINK_OUT,
  SINK_OUT_STILL,
  stampIn,
} from '@/features/challenge/prototype-not-boring/pagaille-style';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Pagaille's countdown: 3, 2, 1 in black on a white plate, stamped down at
// the middle of the stage with its finger snap (use-countdown-sounds.ts).
// The plate is the menus' cut plate (pagaille-menu.tsx), but it doesn't
// stay put: it's cut from the other side at each count, so it rocks from
// one edge to the other while the number grows — that, not a change of
// color, is what says the go is coming. Its shadow is black, not the
// accent: it hollows the plate out instead of bringing a color in, and the
// white reads harder for it. The number stays centered: it only turns.
// The one before is pressed into the page under the one landing on it.
// Reduced motion: each number fades in, the one before fades out.

// Each count's plate, in points at a ~390pt wide screen (an iPhone 14/15):
// - `size`: the digit, which grows by about a third at each count.
// - `cut`: the plate's slant, the skew of the menus' plates — negative
//   leans its top to the right. It swaps sides at each count: that's the
//   rocking. About 6 degrees on a box this tall cuts an eighth off the
//   plate's width, the slant the artifact was chosen on.
// - `lean`: how far the whole thing turns, the same way as its cut.
// - `shadow`: how far under the plate its black shadow sits.
type Step = { size: number; cut: string; lean: string; shadow: number };
const FIRST: Step = { size: 124, cut: '-6deg', lean: '-4deg', shadow: 7 };
// Keyed by the count itself. A count outside the three falls back to the
// first one, so a longer countdown still shows something sane.
const STEPS: Record<number, Step | undefined> = {
  3: FIRST,
  2: { size: 160, cut: '6deg', lean: '4deg', shadow: 9 },
  1: { size: 210, cut: '-7deg', lean: '-3deg', shadow: 12 },
};

// The plate around the digit, and the narrowest it can get, in the digit's
// own size: League Gothic's 1 is half the width of its 2, and without a
// floor its plate would come out a stick rather than a plate.
const PAD_X = 0.3;
const PAD_Y = 0.045;
const MIN_WIDTH = 0.8;
// The shadow is black on the game's near-black background: without an
// edge it disappears rather than reading as a plate behind the plate. A
// thin, translucent white line traces it instead of lightening its fill.
const SHADOW_EDGE = 1.5;
const SHADOW_EDGE_COLOR = 'rgba(255, 255, 255, 0.28)';

// Built once: a new keyframes object on a re-render could replay the
// entrance.
const STAMP = stampIn(0);
const STAMP_STILL = fadeIn(0);

type Props = {
  // 3, 2, 1 as they're counted; 0 before the count starts, and from the go.
  count: number;
  skin: Skin;
};

export function PagailleCountdown({ count, skin }: Props) {
  const reducedMotion = useReducedMotion();
  // The number on its way out is the one this render replaces. Adjusted
  // during the render rather than in an effect, so the two are stamped and
  // pressed down in the same frame.
  const [step, setStep] = React.useState({ count, leaving: null as number | null });

  if (count <= 0)
    return null;
  if (step.count !== count)
    setStep({ count, leaving: step.count > count ? step.count : null });
  return (
    <View
      style={styles.stage}
      pointerEvents="none"
      // Announced by the countdown itself (not-boring-challenge.tsx).
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* First, so the one landing covers the one being pressed down. It
          stays mounted, faded out, until the next count replaces it: one
          view, no timer to clear. */}
      {step.leaving !== null && (
        <Digit key={`leaving-${step.leaving}`} count={step.leaving} skin={skin} reducedMotion={reducedMotion} leaving />
      )}
      <Digit key={count} count={count} skin={skin} reducedMotion={reducedMotion} />
    </View>
  );
}

type DigitProps = {
  count: number;
  skin: Skin;
  reducedMotion: boolean;
  leaving?: boolean;
};

function Digit({ count, skin, reducedMotion, leaving = false }: DigitProps) {
  const { size, cut, lean, shadow } = STEPS[count] ?? FIRST;
  const move = leaving
    ? (reducedMotion ? SINK_OUT_STILL : SINK_OUT)
    : (reducedMotion ? STAMP_STILL : STAMP);
  return (
    // Its turn on the outside, so the stamp's scale doesn't replace it.
    <View style={[styles.place, { transform: [{ rotate: lean }] }]}>
      <Animated.View style={move}>
        <View
          style={[
            styles.plate,
            styles.shadowEdge,
            { backgroundColor: '#000000', transform: [{ translateX: shadow }, { translateY: shadow }, { skewX: cut }] },
          ]}
        />
        <View style={[styles.plate, { backgroundColor: skin.ink, transform: [{ skewX: cut }] }]} />
        <Text
          style={[
            GOTHIC,
            styles.number,
            {
              fontSize: size,
              lineHeight: size,
              marginBottom: digitRise(size),
              paddingHorizontal: size * PAD_X,
              paddingVertical: size * PAD_Y,
              minWidth: size * MIN_WIDTH,
              color: ON_SPLASH,
            },
          ]}
        >
          {count}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Each number fills the stage and centers itself in it, so they stack
  // right on top of one another whatever their size.
  place: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plate: {
    ...StyleSheet.absoluteFillObject,
  },
  shadowEdge: {
    borderWidth: SHADOW_EDGE,
    borderColor: SHADOW_EDGE_COLOR,
  },
  number: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});
