import type { Challenge } from '@/features/challenge/challenges';
import * as React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { ClipPath, Defs, Path, Polygon, Svg } from 'react-native-svg';
import { Text } from '@/components/ui';
import { challengeTitle } from '@/features/challenge/challenges';
import { menuTapHaptic } from '@/features/challenge/haptics';
import { fadeIn, GOTHIC, ON_SPLASH, PRESS_DEPTH, PRESS_TRANSITION, slideIn, stampIn } from '@/features/challenge/prototype-not-boring/pagaille-style';
import { SKINS } from '@/features/challenge/prototype-not-boring/skins';
import { CountBox } from '@/features/home/components/count-box';
import { translate } from '@/lib/i18n';

// A challenge as an item of Persona 5's menus, under the home screen's
// title (home-title.tsx): a black plate across the screen, its left end cut
// like a bolt, halftone dots fading out from the cut; on the right, its
// count in a white box — as the title's cut-out first letter — and the word
// next to it. Lit — white over its accent shadow — from the finger landing
// on it until its sheet is gone, as Persona's cursor on the chosen item.
// Slides in from the left, where it's anchored, one after the other, then
// its count is stamped down. Reduced motion: fades in, in the same order.

const SKIN = SKINS.white;
const HEIGHT = 104;
// Past the screen's left edge, and short of its right one.
const BLEED = 14;
const SHORT = 8;
// The plate's outline, in fractions of its width and height.
const CUT = [[0, 0.36], [0.11, 0.18], [0.08, 0], [1, 0], [0.96, 1], [0.14, 1], [0.17, 0.7], [0.03, 0.8]] as const;
// Halftone: a dot every DOT_STEP points, DOT_RADIUS at the left end,
// shrinking to nothing DOTS_FADE of the way across.
const DOT_STEP = 7;
const DOT_RADIUS = 2.2;
const DOTS_FADE = 0.42;
const DOT_COLOR = '#2E2E2E';
const DOT_COLOR_LIT = '#D2D2D2';
const SHADOW_OFFSET = 7;
// Each item's lean, in degrees, cycling.
const ITEM_LEAN = [-2.5, -1];
const COUNT_SIZE = 96;
// The items slide in from ITEMS_AT ms after the mount, once the title's
// plates are in, ITEM_STAGGER_MS apart; each count COUNT_AFTER_MS later.
const ITEMS_AT = 340;
const ITEM_STAGGER_MS = 60;
const COUNT_AFTER_MS = 170;
const SLIDE_FROM = -110;
const MAX_ITEMS = 8;

// Built once: a new keyframes object on a re-render could replay the entrance.
const itemAt = (i: number) => ITEMS_AT + i * ITEM_STAGGER_MS;
const SLIDES = Array.from({ length: MAX_ITEMS }, (_, i) => slideIn(itemAt(i), SLIDE_FROM));
const SLIDES_STILL = Array.from({ length: MAX_ITEMS }, (_, i) => fadeIn(itemAt(i)));
const STAMPS = Array.from({ length: MAX_ITEMS }, (_, i) => stampIn(itemAt(i) + COUNT_AFTER_MS));
const STAMPS_STILL = Array.from({ length: MAX_ITEMS }, (_, i) => fadeIn(itemAt(i) + COUNT_AFTER_MS));

function outline(width: number, height: number) {
  return CUT.map(([x, y]) => `${x * width},${y * height}`).join(' ');
}

// The dots as one path, a circle each: one node to draw, not hundreds.
// Every other row shifted half a step, as printed halftone.
function halftone(width: number, height: number) {
  const fadeEnd = width * DOTS_FADE;
  let path = '';
  for (let y = 0; y <= height; y += DOT_STEP) {
    for (let x = (y / DOT_STEP) % 2 === 0 ? 0 : DOT_STEP / 2; x < fadeEnd; x += DOT_STEP) {
      const r = DOT_RADIUS * (1 - x / fadeEnd);
      if (r >= 0.4)
        path += `M${(x - r).toFixed(2)},${y}a${r.toFixed(2)},${r.toFixed(2)} 0 1,0 ${(r * 2).toFixed(2)},0a${r.toFixed(2)},${r.toFixed(2)} 0 1,0 ${(-r * 2).toFixed(2)},0`;
    }
  }
  return path;
}

type Props = {
  challenge: Challenge;
  // Its place in the menu, from the top.
  step: number;
  lit: boolean;
  // The finger landing on it, ahead of the press: its sound.
  onPressIn: () => void;
  onPress: () => void;
};

export function ChallengeCard({ challenge, step, lit, onPressIn, onPress }: Props) {
  const reducedMotion = useReducedMotion();
  const { width: screenWidth } = useWindowDimensions();
  const [pressed, setPressed] = React.useState(false);
  const width = screenWidth + BLEED - SHORT;
  const points = React.useMemo(() => outline(width, HEIGHT), [width]);
  const dots = React.useMemo(() => halftone(width, HEIGHT), [width]);
  const title = challengeTitle(challenge);
  const subtitle = translate('home.problem_count', { count: challenge.problemCount });
  const on = lit || pressed;
  // Pressed, the plate and its content go down into the shadow, as the
  // finger lands. Reduced motion dims them instead.
  const sink = pressed && !reducedMotion;
  const dim = pressed && reducedMotion;
  const appear = Math.min(step, MAX_ITEMS - 1);
  const clip = `cut-${challenge.id}`;

  return (
    <View style={{ transform: [{ rotate: `${ITEM_LEAN[step % ITEM_LEAN.length] ?? 0}deg` }] }}>
      <Animated.View style={reducedMotion ? SLIDES_STILL[appear] : SLIDES[appear]}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            setPressed(true);
            menuTapHaptic();
            onPressIn();
          }}
          onPressOut={() => setPressed(false)}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${subtitle}`}
          style={[styles.item, { width }]}
        >
          {on && (
            <Svg width={width} height={HEIGHT} style={styles.shadow}>
              <Polygon points={points} fill={SKIN.accent} />
            </Svg>
          )}
          <Animated.View style={[styles.plate, PRESS_TRANSITION, sink ? styles.pressed : styles.rest, dim && styles.dimmed]}>
            <Svg width={width} height={HEIGHT}>
              <Defs>
                <ClipPath id={clip}>
                  <Polygon points={points} />
                </ClipPath>
              </Defs>
              <Polygon points={points} fill={on ? SKIN.ink : '#000000'} />
              <Path d={dots} fill={on ? DOT_COLOR_LIT : DOT_COLOR} clipPath={`url(#${clip})`} />
            </Svg>
            <View style={styles.face}>
              <CountBox
                count={challenge.problemCount}
                size={COUNT_SIZE}
                inverted={on}
                entrance={reducedMotion ? STAMPS_STILL[appear] : STAMPS[appear]}
              />
              <Text style={[GOTHIC, styles.label, { color: on ? ON_SPLASH : SKIN.ink }]} numberOfLines={1}>
                {translate('home.calculations').toUpperCase()}
              </Text>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    height: HEIGHT,
    marginLeft: -BLEED,
    // The plate's cut is drawn for the left end: the same way round in
    // every language.
    direction: 'ltr',
  },
  shadow: {
    position: 'absolute',
    left: SHADOW_OFFSET,
    top: SHADOW_OFFSET,
  },
  plate: {
    ...StyleSheet.absoluteFillObject,
  },
  rest: {
    transform: [{ translateX: 0 }, { translateY: 0 }],
  },
  pressed: {
    transform: [{ translateX: PRESS_DEPTH }, { translateY: PRESS_DEPTH }],
  },
  dimmed: {
    opacity: 0.8,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    paddingRight: 36,
  },
  label: {
    flexShrink: 1,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 1,
  },
});
