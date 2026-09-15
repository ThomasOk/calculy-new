import type { StyleProp, ViewStyle } from 'react-native';
import type { CSSAnimationProperties } from 'react-native-reanimated';
import type { GlossTone } from '@/features/challenge/components/gloss-styles';
import * as React from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { Text, View } from '@/components/ui';
import { GlossFace, GlossHighlight } from '@/features/challenge/components/gloss';
import { GlossPressable } from '@/features/challenge/components/gloss-pressable';
import {
  EMBOSSED_TEXT,
  ENGRAVED_TEXT,
  GLOSS_DROP_SHADOW,
  GLOSS_INK,
  GLOSS_INK_SECONDARY,
} from '@/features/challenge/components/gloss-styles';
import { formatElapsed } from '@/features/challenge/format-elapsed';
import { DIGITS_FONT } from '@/features/challenge/typography';
import { translate } from '@/lib/i18n';

const TILE_RADIUS = 24;
const BUTTON_RADIUS = 16;
// See challenge-countdown.tsx for the cast.
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1) as unknown as 'ease-out';

// The results rise into place top to bottom, one block every 60ms: the
// headline, each tile, then the buttons. The first waits 100ms so the board
// is mostly faded before anything crosses it. Plays once per run, so each
// block can take the full 300ms. Fill mode `backwards` keeps a block hidden
// through its delay.
const FIRST_DELAY_MS = 100;
const STAGGER_MS = 60;
const STEP_COUNT = 5;

function rise(step: number) {
  return {
    animationName: {
      from: { opacity: 0, transform: [{ translateY: 12 }, { scale: 0.97 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    },
    animationDuration: '300ms',
    animationDelay: `${FIRST_DELAY_MS + step * STAGGER_MS}ms`,
    animationTimingFunction: EASE_OUT,
    animationFillMode: 'backwards',
  } satisfies CSSAnimationProperties;
}

// Reduced motion keeps the staggered fades, which carry the order, and drops
// the rise and the scale.
function fade(step: number) {
  return {
    ...rise(step),
    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
  } satisfies CSSAnimationProperties;
}

// Built once: a new keyframes object on a re-render could replay the entrance.
const RISE = Array.from({ length: STEP_COUNT }, (_, step) => rise(step));
const FADE = Array.from({ length: STEP_COUNT }, (_, step) => fade(step));

type Props = {
  correct: number;
  mistakes: number;
  elapsedMs: number;
  onRestart: () => void;
  onChooseChallenge: () => void;
};

// Laid over the board once it has faded out, on the same sky.
export function ChallengeResults({ correct, mistakes, elapsedMs, onRestart, onChooseChallenge }: Props) {
  const reducedMotion = useReducedMotion();
  const steps = reducedMotion ? FADE : RISE;
  const time = formatElapsed(elapsedMs);
  const correctLabel = translate('challenge.results.correct');
  const mistakesLabel = translate('challenge.results.mistakes');
  const timeLabel = translate('challenge.results.time');

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `${translate('challenge.finished')} ${correctLabel}, ${correct}. ${mistakesLabel}, ${mistakes}. ${timeLabel}, ${time}.`,
    );
  }, [correct, correctLabel, mistakes, mistakesLabel, time, timeLabel]);

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.content} alwaysBounceVertical={false}>
        <Animated.View style={steps[0]}>
          <Text
            tx="challenge.finished"
            style={[DIGITS_FONT, ENGRAVED_TEXT, styles.headline]}
            accessibilityRole="header"
          />
        </Animated.View>
        <View className="flex-row gap-3">
          {/* A count of zero stays pearl: a red tile reading 0 looks like an
              error. */}
          <StatTile
            label={correctLabel}
            value={String(correct)}
            tone={correct > 0 ? 'correct' : 'pearl'}
            style={[styles.half, steps[1]]}
          />
          <StatTile
            label={mistakesLabel}
            value={String(mistakes)}
            tone={mistakes > 0 ? 'wrong' : 'pearl'}
            style={[styles.half, steps[2]]}
          />
        </View>
        <StatTile label={timeLabel} value={time} tone="pearl" style={steps[3]} />
        <Animated.View style={[styles.actions, steps[4]]}>
          {/* Green, like the = key: the one saturated face is the primary
              action. */}
          <GlossPressable tone="green" radius={BUTTON_RADIUS} style={styles.button} onPress={onRestart}>
            <Text style={[DIGITS_FONT, EMBOSSED_TEXT, styles.buttonLabel, styles.primaryLabel]}>
              {translate('challenge.restart')}
            </Text>
          </GlossPressable>
          <GlossPressable radius={BUTTON_RADIUS} style={styles.button} onPress={onChooseChallenge}>
            <Text style={[DIGITS_FONT, ENGRAVED_TEXT, styles.buttonLabel, styles.secondaryLabel]}>
              {translate('challenge.results.back')}
            </Text>
          </GlossPressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

type TileProps = {
  label: string;
  value: string;
  tone: GlossTone;
  style?: StyleProp<ViewStyle>;
};

// A card like the calculation rows, in the face of what it counts.
function StatTile({ label, value, tone, style }: TileProps) {
  return (
    <Animated.View
      style={[styles.tile, style]}
      accessible
      accessibilityLabel={`${label}, ${value}`}
    >
      <GlossFace layer={tone} radius={TILE_RADIUS} />
      <GlossHighlight radius={TILE_RADIUS} />
      <Text
        style={[DIGITS_FONT, ENGRAVED_TEXT, styles.value]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[ENGRAVED_TEXT, styles.label]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headline: {
    marginBottom: 12,
    fontSize: 44,
    lineHeight: 56,
    textAlign: 'center',
    color: GLOSS_INK,
  },
  half: {
    flex: 1,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: TILE_RADIUS,
    boxShadow: GLOSS_DROP_SHADOW,
  },
  value: {
    fontSize: 40,
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
    color: GLOSS_INK,
  },
  label: {
    fontSize: 15,
    color: GLOSS_INK_SECONDARY,
  },
  actions: {
    marginTop: 12,
    gap: 12,
  },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonLabel: {
    fontSize: 20,
    lineHeight: 26,
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: GLOSS_INK,
  },
});
