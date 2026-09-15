import type { SharedValue } from 'react-native-reanimated';
import type { Problem } from '@/features/challenge/problems';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { Tilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import * as React from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Polygon, Svg } from 'react-native-svg';
import { Text } from '@/components/ui';
import { formatElapsed } from '@/features/challenge/format-elapsed';
import { MenuButton, PlateTitle } from '@/features/challenge/prototype-not-boring/pagaille-menu';
import { PagailleScore } from '@/features/challenge/prototype-not-boring/pagaille-score';
import { fadeIn, GOTHIC, riseIn, SERIF, SKEW, slideIn } from '@/features/challenge/prototype-not-boring/pagaille-style';
import { translate } from '@/lib/i18n';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Pagaille's results, as Persona's end-of-battle screen in the mess of the
// calculations' stack: nothing straight, everything leaning its own way.
// - The verdict, Perfect! without a mistake, Clear! otherwise, on a black
//   plate over a shard of paint, as the home screen's title
//   (pagaille-menu.tsx); cut out of the accent's paper for a perfect run.
// - The score, the selected item, on a splash of paint across a black
//   slash: it counts up and lands on the results' chord (pagaille-score.tsx).
// - Mistakes, best combo and time on black plates, sliding in from the
//   right one after the other, like a menu's items.
// - Restart as the selected menu item, a white plate over its accent
//   shadow that it's pressed down into; back to the challenges as a plain
//   black one (pagaille-menu.tsx).
// All timed from the results showing with their sound (use-results-sound.ts):
// a run up the Rhodes, then its chord at LAND_MS.
// Reduced motion: everything fades in, in the same order; nothing moves.

// The timeline, in ms from the results showing: the score lands on the
// chord, then the plates slide in, then the buttons rise.
const LAND_MS = 360;
const ROWS_AT = LAND_MS + 40;
const ROW_STAGGER_MS = 70;
const BUTTONS_AT = ROWS_AT + 3 * ROW_STAGGER_MS;
const BUTTON_STAGGER_MS = 60;
// The verdict's letters, in points; its cut letters are stamped down at
// TITLE_CUTS_AT, before the score lands. Its plate slides in from the
// left, its shard of paint from the right.
const TITLE_SIZE = 76;
const TITLE_CUTS_AT = 150;
const PLATE_FROM = -110;
const SHARD_FROM = 60;
const SHARD = '0,70 96,40 84,28 170,0 170,40 112,62 124,74 20,116';
// Each row's and button's lean, in degrees, and each row's shift, in points.
const ROW_LEAN = [-2, 1.5, -1];
const ROW_SHIFT = [8, -6, 14];
const BUTTON_LEAN = [-2, 1.5];

// Built once: a new keyframes object on a re-render could replay the entrance.
const SLIDES = Array.from({ length: 3 }, (_, i) => slideIn(ROWS_AT + i * ROW_STAGGER_MS));
const SLIDES_STILL = Array.from({ length: 3 }, (_, i) => fadeIn(ROWS_AT + i * ROW_STAGGER_MS));
const RISES = Array.from({ length: 2 }, (_, i) => riseIn(BUTTONS_AT + i * BUTTON_STAGGER_MS));
const RISES_STILL = Array.from({ length: 2 }, (_, i) => fadeIn(BUTTONS_AT + i * BUTTON_STAGGER_MS));
const TITLE_IN = slideIn(0, PLATE_FROM);
const TITLE_IN_STILL = fadeIn(0);
const SHARD_IN = slideIn(40, SHARD_FROM);
const SHARD_IN_STILL = fadeIn(40);

type Props = {
  problems: Problem[];
  answers: number[];
  elapsedMs: number;
  skin: Skin;
  tilt: SharedValue<Tilt>;
  onRestart: () => void;
  onQuit: () => void;
};

export function PagailleResults({ problems, answers, elapsedMs, skin, tilt, onRestart, onQuit }: Props) {
  const reducedMotion = useReducedMotion();
  const correct = answers.filter((answer, index) => answer === problems[index]?.answer).length;
  const mistakes = answers.length - correct;
  const time = formatElapsed(elapsedMs);
  const stats: Stat[] = [
    { label: translate('challenge.results.mistakes'), value: String(mistakes), color: mistakes > 0 ? skin.wrong : skin.ink },
    { label: translate('challenge.results.best_combo'), value: `×${bestStreak(problems, answers)}`, color: skin.accent },
    { label: translate('challenge.results.time'), value: time, color: skin.ink },
  ];
  const perfect = mistakes === 0;
  const verdict = translate(perfect ? 'challenge.results.perfect' : 'challenge.results.clear');
  useAnnouncement({ verdict, correct, mistakes, time });

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} alwaysBounceVertical={false}>
        <Verdict text={verdict} perfect={perfect} skin={skin} reducedMotion={reducedMotion} />
        <View
          style={styles.score}
          accessible
          accessibilityLabel={`${translate('challenge.results.correct')}, ${correct} / ${problems.length}`}
        >
          <View style={styles.slash} />
          <PagailleScore correct={correct} total={problems.length} skin={skin} tilt={tilt} landAt={LAND_MS} />
        </View>
        <View style={styles.rows}>
          {stats.map((stat, step) => (
            <StatRow key={stat.label} stat={stat} step={step} skin={skin} reducedMotion={reducedMotion} />
          ))}
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Animated.View style={[styles.buttonPrimary, reducedMotion ? RISES_STILL[0] : RISES[0]]}>
          <MenuButton label={translate('challenge.restart')} primary lean={BUTTON_LEAN[0] ?? 0} skin={skin} onPress={onRestart} reducedMotion={reducedMotion} />
        </Animated.View>
        <Animated.View style={[styles.buttonSecondary, reducedMotion ? RISES_STILL[1] : RISES[1]]}>
          <MenuButton label={translate('challenge.results.back')} primary={false} lean={BUTTON_LEAN[1] ?? 0} skin={skin} onPress={onQuit} reducedMotion={reducedMotion} />
        </Animated.View>
      </View>
    </View>
  );
}

// The most correct answers in a row.
function bestStreak(problems: Problem[], answers: number[]) {
  let best = 0;
  let streak = 0;
  answers.forEach((answer, index) => {
    streak = answer === problems[index]?.answer ? streak + 1 : 0;
    best = Math.max(best, streak);
  });
  return best;
}

function useAnnouncement({ verdict, correct, mistakes, time }: { verdict: string; correct: number; mistakes: number; time: string }) {
  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `${verdict} ${translate('challenge.results.correct')}, ${correct}. ${translate('challenge.results.mistakes')}, ${mistakes}. ${translate('challenge.results.time')}, ${time}.`,
    );
  }, [verdict, correct, mistakes, time]);
}

type VerdictProps = { text: string; perfect: boolean; skin: Skin; reducedMotion: boolean };

// The verdict on its plate, leaning from its left end, off the screen,
// over a shard of paint on the right.
function Verdict({ text, perfect, skin, reducedMotion }: VerdictProps) {
  return (
    <View style={styles.verdict}>
      <Animated.View
        style={[styles.shard, reducedMotion ? SHARD_IN_STILL : SHARD_IN]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={170} height={116} viewBox="0 0 170 116">
          <Polygon points={SHARD} fill={skin.accent} />
        </Svg>
      </Animated.View>
      <View style={styles.verdictPlace}>
        <Animated.View style={reducedMotion ? TITLE_IN_STILL : TITLE_IN}>
          <PlateTitle
            text={text}
            skin={skin}
            size={TITLE_SIZE}
            paper={perfect ? 'accent' : 'ink'}
            entrance={reducedMotion ? 'fade' : 'stamp'}
            cutsAt={TITLE_CUTS_AT}
            style={styles.verdictPlate}
          />
        </Animated.View>
      </View>
    </View>
  );
}

type Stat = { label: string; value: string; color: string };
type StatRowProps = { stat: Stat; step: number; skin: Skin; reducedMotion: boolean };

function StatRow({ stat, step, skin, reducedMotion }: StatRowProps) {
  const place = { transform: [{ translateX: ROW_SHIFT[step] ?? 0 }, { rotate: `${ROW_LEAN[step] ?? 0}deg` }] };
  return (
    <View style={place}>
      <Animated.View
        style={[styles.row, reducedMotion ? SLIDES_STILL[step] : SLIDES[step]]}
        accessible
        accessibilityLabel={`${stat.label}, ${stat.value}`}
      >
        <View style={styles.plate} />
        <View style={[styles.stripe, { backgroundColor: skin.accent }]} />
        <Text style={[GOTHIC, styles.rowLabel, { color: skin.muted }]} numberOfLines={1}>
          {stat.label.toUpperCase()}
        </Text>
        <Text style={[SERIF, styles.rowValue, { color: stat.color }]} numberOfLines={1}>
          {stat.value}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  verdict: {
    height: 104,
    // The cut letters lead: the same way round in every language.
    direction: 'ltr',
  },
  shard: {
    position: 'absolute',
    right: -10,
    top: -6,
  },
  verdictPlace: {
    position: 'absolute',
    left: -26,
    top: 16,
    transformOrigin: 'left center',
    transform: [{ rotate: '-6deg' }],
  },
  verdictPlate: {
    paddingTop: 4,
    paddingBottom: 8,
    paddingLeft: 54,
    paddingRight: 36,
  },
  score: {
    flex: 1,
    minHeight: 170,
  },
  // Across the whole screen, under the splash.
  slash: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: '30%',
    bottom: '24%',
    backgroundColor: '#000000',
    transform: [{ rotate: '-8deg' }],
  },
  rows: {
    gap: 10,
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  row: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingLeft: 30,
    paddingRight: 22,
  },
  plate: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    transform: [{ skewX: SKEW }],
  },
  stripe: {
    position: 'absolute',
    left: 6,
    top: 0,
    bottom: 0,
    width: 8,
    transform: [{ skewX: SKEW }],
  },
  rowLabel: {
    flexShrink: 1,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 1,
  },
  rowValue: {
    fontSize: 28,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  buttonPrimary: {
    marginRight: 28,
  },
  buttonSecondary: {
    marginLeft: 44,
  },
});
