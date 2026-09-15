import type { LayoutChangeEvent } from 'react-native';
import type { CSSAnimationProperties, CSSTransitionProperties } from 'react-native-reanimated';
import type { Problem } from '@/features/challenge/problems';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Text, View } from '@/components/ui';
import { GlossFace, GlossHighlight } from '@/features/challenge/components/gloss';
import { ENGRAVED_TEXT, GLOSS_DROP_SHADOW, GLOSS_INK } from '@/features/challenge/components/gloss-styles';
import { formatProblem } from '@/features/challenge/problems';
import { DIGITS_FONT } from '@/features/challenge/typography';

const VISIBLE_ROWS = 3;
const ROW_GAP = 16;
const CARD_RADIUS = 24;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

// Transitions go through Reanimated's `transition` shorthand and live outside
// StyleSheet.create: React Native's style types reject Reanimated's longhand
// transition props (numeric durations, `cubicBezier()` objects).
// Fires on every answer, so it has to be over before the next digit lands.
const SLOT_TRANSITION = {
  transition: `transform 150ms ${EASE_OUT}, opacity 150ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;
// Reduced motion: rows jump to their slot, only the fades remain.
const SLOT_TRANSITION_REDUCED = {
  transition: `opacity 150ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;
// A row changes color by fading its correct or wrong face in over the pearl
// one: gradients can't be transitioned.
const FACE_TRANSITION = {
  transition: `opacity 150ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;
// Plays once when a row turns wrong, while it slides up. Longer than the slide
// so it still reads, but errors are rarer than correct answers. Lives on the
// card, not the slot: an animated transform would override the slot's
// translateY and freeze the slide.
const WRONG_SHAKE = {
  animationName: {
    '0%': { transform: [{ translateX: 0 }] },
    '15%': { transform: [{ translateX: -6 }] },
    '35%': { transform: [{ translateX: 6 }] },
    '55%': { transform: [{ translateX: -4 }] },
    '75%': { transform: [{ translateX: 3 }] },
    '100%': { transform: [{ translateX: 0 }] },
  },
  animationDuration: '200ms',
  // A predefined curve: React Native's style types reject `cubicBezier()` and
  // Reanimated rejects a `cubic-bezier()` string outside the shorthand. Each
  // swing lasts ~40ms, too short for the exact curve to show.
  animationTimingFunction: 'ease-in-out',
} satisfies CSSAnimationProperties;

type RowStatus = 'correct' | 'wrong' | 'current' | 'upcoming';

// Slot 0 is the calculation just answered, 1 the current one, 2 the next one.
// Slots -1 and 3 sit off-screen at opacity 0: a row is mounted one slot before
// it shows and unmounted one slot after it fades, so every visible change is a
// transition between two real positions — never a mount or an unmount.
const SLOT_OPACITY: Record<number, number> = { [-1]: 0, 0: 1, 1: 1, 2: 0.45, 3: 0 };

type Props = {
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  input: string;
};

export function ProblemCarousel({ problems, answers, currentIndex, input }: Props) {
  const reducedMotion = useReducedMotion();
  // Measured rather than hardcoded so the rows follow the space left by the
  // keypad and survive large accessibility text sizes.
  const [slotHeight, setSlotHeight] = React.useState(0);
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    setSlotHeight(event.nativeEvent.layout.height / VISIBLE_ROWS);
  }, []);

  const first = Math.max(0, currentIndex - 2);
  const last = Math.min(problems.length, currentIndex + 3);

  return (
    <View testID="problem-carousel" className="flex-1" onLayout={onLayout}>
      {slotHeight > 0
        && problems.slice(first, last).map((problem, offset) => {
          const index = first + offset;
          const answer = answers[index];
          const status: RowStatus
            = answer !== undefined
              ? answer === problem.answer ? 'correct' : 'wrong'
              : index === currentIndex ? 'current' : 'upcoming';
          return (
            <ProblemRow
              key={index}
              label={formatProblem(problem)}
              value={answer !== undefined ? String(answer) : status === 'current' ? input : ''}
              status={status}
              slot={index - currentIndex + 1}
              slotHeight={slotHeight}
              reducedMotion={reducedMotion}
            />
          );
        })}
    </View>
  );
}

type RowProps = {
  label: string;
  value: string;
  status: RowStatus;
  slot: number;
  slotHeight: number;
  reducedMotion: boolean;
};

function ProblemRow({ label, value, status, slot, slotHeight, reducedMotion }: RowProps) {
  return (
    <Animated.View
      style={[
        styles.slot,
        reducedMotion ? SLOT_TRANSITION_REDUCED : SLOT_TRANSITION,
        {
          height: slotHeight - ROW_GAP,
          opacity: SLOT_OPACITY[slot] ?? 0,
          transform: [{ translateY: slot * slotHeight + ROW_GAP / 2 }],
        },
      ]}
    >
      <Animated.View
        style={[styles.card, status === 'wrong' && !reducedMotion && WRONG_SHAKE]}
      >
        <GlossFace layer="pearl" radius={CARD_RADIUS} />
        <GlossFace
          layer="correct"
          radius={CARD_RADIUS}
          style={[FACE_TRANSITION, { opacity: status === 'correct' ? 1 : 0 }]}
        />
        <GlossFace
          layer="wrong"
          radius={CARD_RADIUS}
          style={[FACE_TRANSITION, { opacity: status === 'wrong' ? 1 : 0 }]}
        />
        <GlossHighlight radius={CARD_RADIUS} />
        <Text
          className="text-4xl"
          style={[DIGITS_FONT, styles.digits, ENGRAVED_TEXT]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {/* No trailing space when empty, so the label stays centered. */}
          {value === '' ? label : `${label} ${value}`}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: CARD_RADIUS,
    boxShadow: GLOSS_DROP_SHADOW,
  },
  digits: {
    fontVariant: ['tabular-nums'],
    color: GLOSS_INK,
  },
});
