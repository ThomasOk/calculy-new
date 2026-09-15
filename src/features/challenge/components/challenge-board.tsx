import type { CSSTransitionProperties } from 'react-native-reanimated';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { View } from '@/components/ui';
import { ChallengeCountdown } from '@/features/challenge/components/challenge-countdown';
import { ChallengeProgress } from '@/features/challenge/components/challenge-progress';
import { ChallengeResults } from '@/features/challenge/components/challenge-results';
import { ChallengeTimer } from '@/features/challenge/components/challenge-timer';
import { Keypad } from '@/features/challenge/components/keypad';
import { ProblemCarousel } from '@/features/challenge/components/problem-carousel';
import { QuitButton } from '@/features/challenge/components/quit-button';
import { answerHaptic } from '@/features/challenge/haptics';
import { useAnswerSounds } from '@/features/challenge/use-answer-sounds';
import { useChallenge } from '@/features/challenge/use-challenge';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
// When the countdown ends the calculations and the keypad rise into place,
// the keypad a beat behind so the eye lands on the first calculation. Plays
// once per run, so it can take the full 300ms. The same transitions fade the
// board out when the results replace it.
const REVEAL_TRANSITION = {
  transition: `opacity 300ms ${EASE_OUT}, transform 300ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;
const REVEAL_TRANSITION_LATE = {
  transition: `opacity 300ms ${EASE_OUT} 60ms, transform 300ms ${EASE_OUT} 60ms`,
} satisfies CSSTransitionProperties;
// The timer fades out with the board: the results show the time themselves.
const FADE_TRANSITION = {
  transition: `opacity 300ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;
const REVEAL_OFFSET = 20;
// After the last answer the board holds still long enough for the row's
// color, shake and sound to land before the results replace it. Also keeps a
// quick second tap on = from landing on a results button.
const RESULTS_DELAY_MS = 600;

type Props = {
  problemCount: number;
  onQuit: () => void;
  // The countdown waits while false. See challenge-screen.tsx.
  ready?: boolean;
};

export function ChallengeBoard({ problemCount, onQuit, ready = true }: Props) {
  const reducedMotion = useReducedMotion();
  const playAnswerSound = useAnswerSounds();
  const onAnswer = React.useCallback(
    (isCorrect: boolean) => {
      answerHaptic(isCorrect);
      playAnswerSound(isCorrect);
    },
    [playAnswerSound],
  );
  const { state, isStarted, isFinished, canConfirm, score, start, pressDigit, erase, confirm, restart }
    = useChallenge({ problemCount, onAnswer });
  const showResults = useShowResults(isFinished, state.runId);
  const isPlaying = isStarted && !showResults;

  // Until the countdown ends, and again once the results replace it, the
  // board is invisible, untouchable and silent to screen readers. Reduced
  // motion keeps the fade and drops the rise; leaving for the results is a
  // fade in place either way.
  const reveal = isPlaying
    ? styles.revealed
    : reducedMotion || showResults ? styles.hiddenInPlace : styles.hidden;
  const hiddenProps = {
    pointerEvents: isPlaying ? 'auto' : 'none',
    accessibilityElementsHidden: !isPlaying,
    importantForAccessibility: isPlaying ? 'auto' : 'no-hide-descendants',
  } as const;

  return (
    <View className="flex-1">
      {/* Outside the hidden halves, so the challenge can be left during the
          countdown too. Equal boxes on both sides keep the timer centered on
          the screen. */}
      <View className="flex-row items-center px-4">
        <View className="flex-1 items-start">
          <QuitButton onPress={onQuit} />
        </View>
        <Animated.View
          style={[FADE_TRANSITION, { opacity: showResults ? 0 : 1 }]}
          accessibilityElementsHidden={showResults}
          importantForAccessibility={showResults ? 'no-hide-descendants' : 'auto'}
        >
          <ChallengeTimer startedAt={state.startedAt} finishedAt={state.finishedAt} />
        </Animated.View>
        <View className="flex-1" />
      </View>
      <View className="flex-1">
        {/* Keyed by run: a restart remounts both halves already hidden for
            the next countdown, and remounts the rows instead of sliding
            them. */}
        <Animated.View
          key={`problems-${state.runId}`}
          {...hiddenProps}
          style={[styles.problems, REVEAL_TRANSITION, reveal]}
        >
          <ChallengeProgress current={state.currentIndex} total={state.problems.length} />
          <ProblemCarousel
            problems={state.problems}
            answers={state.answers}
            currentIndex={state.currentIndex}
            input={state.input}
          />
        </Animated.View>
        {/* Stays mounted once finished, dimmed by its disabled keys until the
            results come, so the carousel above keeps its height and the rows
            don't shift. */}
        <Animated.View
          key={`keypad-${state.runId}`}
          {...hiddenProps}
          style={[styles.keypad, REVEAL_TRANSITION_LATE, reveal]}
        >
          <Keypad
            onDigit={pressDigit}
            onErase={erase}
            onConfirm={confirm}
            canConfirm={canConfirm}
            disabled={isFinished}
          />
        </Animated.View>
        {/* No exit animation: Restart swaps it for the countdown, whose 3
            carries the change, and Back leaves with the screen. */}
        {showResults && (
          <ChallengeResults
            correct={score}
            mistakes={state.answers.length - score}
            elapsedMs={(state.finishedAt ?? 0) - (state.startedAt ?? 0)}
            onRestart={restart}
            onChooseChallenge={onQuit}
          />
        )}
      </View>
      {!isStarted && ready && <ChallengeCountdown onDone={start} />}
    </View>
  );
}

// True from RESULTS_DELAY_MS after the run finishes until the next run.
// Remembers which run it fired for, so a restart hides the results without
// resetting anything.
function useShowResults(isFinished: boolean, runId: number) {
  const [resultsRunId, setResultsRunId] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!isFinished)
      return;
    const timeout = setTimeout(() => setResultsRunId(runId), RESULTS_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [isFinished, runId]);
  return isFinished && resultsRunId === runId;
}

const styles = StyleSheet.create({
  problems: {
    flex: 1,
    paddingHorizontal: 24,
  },
  keypad: {
    paddingTop: 8,
  },
  hidden: {
    opacity: 0,
    transform: [{ translateY: REVEAL_OFFSET }],
  },
  hiddenInPlace: {
    opacity: 0,
    transform: [{ translateY: 0 }],
  },
  revealed: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
});
