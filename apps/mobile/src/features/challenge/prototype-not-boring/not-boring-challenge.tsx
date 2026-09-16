import type { CSSAnimationProperties, CSSTransitionProperties } from 'react-native-reanimated';
import type { NumberFeedback } from '@/features/challenge/prototype-not-boring/answer-hit';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import type { NumberBox } from '@/features/challenge/prototype-not-boring/streak-rays';
import type { ChallengeState } from '@/features/challenge/use-challenge';
import * as React from 'react';
import { AccessibilityInfo, View as NativeView, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cubicBezier,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { FocusAwareStatusBar, Text, View } from '@/components/ui';
import { formatElapsed } from '@/features/challenge/format-elapsed';
import { answerHaptic, countdownGoHaptic, countdownTickHaptic, keyTapHaptic } from '@/features/challenge/haptics';
import { PagailleCountdown } from '@/features/challenge/prototype-not-boring/pagaille-countdown';
import { PagailleProgress } from '@/features/challenge/prototype-not-boring/pagaille-progress';
import { PagailleResults } from '@/features/challenge/prototype-not-boring/pagaille-results';
import { usePagailleFonts } from '@/features/challenge/prototype-not-boring/pagaille-style';
import { ProblemPagaille } from '@/features/challenge/prototype-not-boring/problem-pagaille';
import { SKINS } from '@/features/challenge/prototype-not-boring/skins';
import { StreakGlow } from '@/features/challenge/prototype-not-boring/streak-glow';
import { StreakRays } from '@/features/challenge/prototype-not-boring/streak-rays';
import { useStreakEffects } from '@/features/challenge/prototype-not-boring/use-streak-effects';
import { useTilt } from '@/features/challenge/prototype-not-boring/use-tilt';
import { useAnswerSounds } from '@/features/challenge/use-answer-sounds';
import { useChallenge } from '@/features/challenge/use-challenge';
import { useCountdownSounds } from '@/features/challenge/use-countdown-sounds';
import { useKeySounds } from '@/features/challenge/use-key-sounds';
import { useResultsSound } from '@/features/challenge/use-results-sound';
import { useSoundBank } from '@/features/challenge/use-sound-bank';
// Results' Restart and back-to-challenges echo the home menu's own Start and
// Cancel (use-menu-sounds.ts): the results screen is a continuation of that
// menu (pagaille-results.tsx), so its buttons borrow its sounds too.
import menuCancelOne from '@/features/home/sounds/menu-cancel-1.wav';
import menuCancelTwo from '@/features/home/sounds/menu-cancel-2.wav';
import menuStartSound from '@/features/home/sounds/menu-start.wav';
import { translate } from '@/lib/i18n';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
// Same game as the old Aqua board (useChallenge, sounds, haptics); only the
// rendering differs: a dark calculator, the calculations stacked in a mess
// down the stage as a Persona menu, the current one on a splash of paint,
// its answer typed in place (problem-pagaille.tsx). The countdown and the
// results are in Persona's style too (pagaille-countdown.tsx,
// pagaille-results.tsx). In a streak (streak.ts), each milestone draws speed
// lines at the calculations and flashes the glow behind them, which steps up
// until the next mistake (streak-rays.tsx, streak-glow.tsx) — the answer
// sound itself doesn't change.
// This was one of several looks tried side by side (see the previous shape
// of challenge-screen.tsx in git history for the others); this is the one
// the app ships.

const FONT = { fontFamily: 'LeagueGothic_400Regular' } as const;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const FADE = { transition: `opacity 300ms ${EASE_OUT}` } satisfies CSSTransitionProperties;
// The roll fading in when the countdown ends, and the giant number when the
// results come. See challenge-countdown.tsx for the cast.
const APPEAR = {
  animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
  animationDuration: '300ms',
  animationTimingFunction: cubicBezier(0.23, 1, 0.32, 1) as unknown as 'ease-out',
} satisfies CSSAnimationProperties;
// A key shows pressed at once, as the finger lands, and lets go over this.
const KEY_RELEASE = { duration: 150, easing: Easing.bezier(0.23, 1, 0.32, 1) };
const KEY_PRESSED_SCALE = 0.97;
const ACTIVATE_ACTION = [{ name: 'activate' }];
// The answered number stays up this long, flashing green or red, before it
// flies out. Typing the next answer replaces it at once.
const FLASH_MS = 400;
const RESULTS_DELAY_MS = 600;
const COUNT_FROM = 3;
const TIMER_TICK_MS = 33;
// Module constants: a bank's sources must keep their identity.
const RESTART_SOUND = [menuStartSound];
const BACK_SOUND = [menuCancelOne, menuCancelTwo];

type Props = {
  problemCount: number;
  streakMilestones: readonly number[];
  onQuit: () => void;
  ready: boolean;
  insets: { top: number; bottom: number };
};

export function NotBoringChallenge({ problemCount, streakMilestones, onQuit, ready, insets }: Props) {
  const skin = SKINS.white;
  // Abril Fatface for Pagaille's results, which also draw it as text.
  const fontsLoaded = usePagailleFonts();
  const reducedMotion = useReducedMotion();
  const { tilt, pan } = useTilt();
  const playAnswerSound = useAnswerSounds();
  const streak = useStreakEffects(streakMilestones);
  const { onAnswer: trackStreak, reset: resetStreak } = streak;
  const onAnswer = React.useCallback(
    (isCorrect: boolean, count: number) => {
      answerHaptic(isCorrect);
      playAnswerSound(isCorrect);
      trackStreak(count);
    },
    [playAnswerSound, trackStreak],
  );
  const numberBox = useNumberBox();
  const { state, isStarted, isFinished, canConfirm, start, pressDigit, erase, confirm, restart }
    = useChallenge({ problemCount, onAnswer });
  const onErase = useSoundedErase(erase);
  const showResults = useShowResults(isFinished, state.runId);
  const isPlaying = isStarted && !showResults;
  const countdown = useCountdown(ready && !isStarted, start, state.runId);
  const [flash, setFlash] = useFlash();
  // A streak's glow doesn't carry over to the next run.
  const { restartRun, onResultsQuit } = useResultsSounds(() => {
    resetStreak();
    restart();
  }, onQuit);

  // The answer comes from the hook rather than this render's state: the
  // digits just typed may not have rendered yet.
  const onConfirm = () => {
    const answer = confirm();
    if (answer)
      setFlash({ id: Date.now(), ...answer });
  };

  if (!fontsLoaded)
    return <View style={[styles.fill, { backgroundColor: skin.background }]} />;

  return (
    <NativeView
      ref={numberBox.rootRef}
      style={[
        styles.fill,
        { backgroundColor: skin.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* First, behind everything. */}
      <StreakGlow level={streak.level} levels={streak.levels} flash={streak.flash} box={numberBox.box} color={skin.accent} />
      <FocusAwareStatusBar style="light" />
      <Header
        skin={skin}
        onQuit={onQuit}
        showResults={showResults}
        state={state}
        playing={isStarted && !isFinished}
      />

      <Stage
        skin={skin}
        tilt={tilt}
        pan={pan}
        state={state}
        isStarted={isStarted}
        showResults={showResults}
        countdown={countdown}
        flash={flash}
        numberRef={numberBox.numberRef}
        onNumberLayout={numberBox.measure}
        onRestart={restartRun}
        onQuit={onResultsQuit}
      />

      {/* The results bring their own buttons (PagailleResults). */}
      {!showResults && (
        <Animated.View
          style={[FADE, { opacity: isPlaying ? 1 : 0.25 }]}
          pointerEvents={isPlaying ? 'auto' : 'none'}
        >
          <FlatKeypad
            skin={skin}
            onDigit={pressDigit}
            onErase={onErase}
            onConfirm={onConfirm}
            canConfirm={canConfirm}
            disabled={isFinished}
            reducedMotion={reducedMotion}
          />
        </Animated.View>
      )}

      {/* Last, over everything, keypad included. */}
      <StreakRays burst={streak.rays} box={numberBox.box} color={skin.ink} />
    </NativeView>
  );
}

// The giant number's box in the screen, where the streak's speed lines aim.
function useNumberBox() {
  const rootRef = React.useRef<NativeView>(null);
  const numberRef = React.useRef<NativeView>(null);
  const [box, setBox] = React.useState<NumberBox | null>(null);
  const measure = React.useCallback(() => {
    const root = rootRef.current;
    if (!root)
      return;
    // The frame comes as four arguments: x, y, width and height.
    numberRef.current?.measureLayout(root, (...frame: number[]) => {
      const [x = 0, y = 0, width = 0, height = 0] = frame;
      setBox({ x, y, width, height });
    });
  }, []);
  return { rootRef, numberRef, box, measure };
}

// The keypad's erase, with its sound (use-key-sounds.ts) first so the sound
// starts with the tap. The digits have none.
function useSoundedErase(erase: () => void) {
  const { playErase } = useKeySounds();
  return () => {
    playErase();
    erase();
  };
}

// The results screen's Restart and back-to-challenges, with the home menu's
// own Start and Cancel sounds (use-menu-sounds.ts): the results screen is a
// continuation of that menu (pagaille-results.tsx). Only its own buttons:
// the in-play header keeps its ✕ silent (Header, further down, gets the raw
// onQuit).
function useResultsSounds(restart: () => void, quit: () => void) {
  const restartSound = useSoundBank(RESTART_SOUND);
  const backSound = useSoundBank(BACK_SOUND);
  return {
    restartRun: () => {
      restartSound.play(0);
      restart();
    },
    onResultsQuit: () => {
      backSound.playNext();
      quit();
    },
  };
}

type StageProps = {
  skin: Skin;
  tilt: ReturnType<typeof useTilt>['tilt'];
  pan: ReturnType<typeof useTilt>['pan'];
  state: ChallengeState;
  isStarted: boolean;
  showResults: boolean;
  // 3, 2, 1, then 0: see useCountdown.
  countdown: number;
  flash: Flash | null;
  // The calculations' box, measured for the streak's speed lines.
  numberRef: React.RefObject<NativeView | null>;
  onNumberLayout: () => void;
  // The results' buttons.
  onRestart: () => void;
  onQuit: () => void;
};

// Everything between the header and the keypad; once the run is over, the
// keypad's place too, for the results' own buttons.
function Stage({ skin, tilt, pan, state, isStarted, showResults, countdown, flash, numberRef, onNumberLayout, onRestart, onQuit }: StageProps) {
  if (showResults) {
    return (
      <PagailleResults
        problems={state.problems}
        answers={state.answers}
        elapsedMs={(state.finishedAt ?? 0) - (state.startedAt ?? 0)}
        skin={skin}
        tilt={tilt}
        onRestart={onRestart}
        onQuit={onQuit}
      />
    );
  }
  return (
    <View style={styles.fill}>
      <GestureDetector gesture={pan}>
        <NativeView ref={numberRef} style={styles.fill} onLayout={onNumberLayout}>
          {/* Remounted as the countdown ends, so the fade-in plays once,
              with the calculations rather than empty. */}
          <Animated.View key={isStarted ? 'playing' : 'countdown'} style={[styles.fill, APPEAR]}>
            {isStarted && (
              <ProblemPagaille
                problems={state.problems}
                answers={state.answers}
                currentIndex={state.currentIndex}
                input={state.input}
                skin={skin}
                tilt={tilt}
                feedback={flash}
              />
            )}
          </Animated.View>
        </NativeView>
      </GestureDetector>

      {/* Over the calculations, which spin in as it goes after the 1. A run
          of its own each, so a restart counts again. */}
      <PagailleCountdown key={state.runId} count={countdown} skin={skin} />
    </View>
  );
}

type HeaderProps = {
  skin: Skin;
  onQuit: () => void;
  showResults: boolean;
  state: ChallengeState;
  // A calculation is being played: not during the countdown, nor once done.
  playing: boolean;
};

function Header({ skin, onQuit, showResults, state, playing }: HeaderProps) {
  return (
    <>
      <HeaderRow skin={skin} onQuit={onQuit} showResults={showResults} startedAt={state.startedAt} finishedAt={state.finishedAt} />
      <Animated.View style={[FADE, { opacity: showResults ? 0 : 1 }]}>
        <PagailleProgress total={state.problems.length} done={state.answers.length} playing={playing} skin={skin} />
      </Animated.View>
    </>
  );
}

type HeaderRowProps = {
  skin: Skin;
  onQuit: () => void;
  showResults: boolean;
  startedAt: number | null;
  finishedAt: number | null;
};

function HeaderRow({ skin, onQuit, showResults, startedAt, finishedAt }: HeaderRowProps) {
  return (
    <View className="flex-row items-center px-4">
      <View className="flex-1 items-start">
        <Pressable
          onPress={onQuit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={translate('challenge.quit')}
        >
          <Text style={[FONT, styles.header, { color: skin.muted }]}>✕</Text>
        </Pressable>
      </View>
      <Animated.View style={[FADE, { opacity: showResults ? 0 : 1 }]}>
        <Timer startedAt={startedAt} finishedAt={finishedAt} color={skin.muted} />
      </Animated.View>
      {/* Balances the ✕ on the left, so the timer stays centered. */}
      <View className="flex-1 items-end" />
    </View>
  );
}

const KEY_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['erase', '0', 'confirm'],
] as const;

type KeypadProps = {
  skin: Skin;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
  disabled: boolean;
  reducedMotion: boolean;
};

function FlatKeypad({ skin, onDigit, onErase, onConfirm, canConfirm, disabled, reducedMotion }: KeypadProps) {
  return (
    // Clear of the screen's bottom edge, on top of the safe area: thumbs
    // rest under the keys rather than against the edge, and the bottom row
    // doesn't sit on a gesture bar.
    <View className="px-10 pb-6">
      {KEY_ROWS.map(row => (
        <View key={row.join()} className="flex-row">
          {row.map((key) => {
            if (key === 'erase') {
              return (
                <FlatKey key={key} label="⌫" color={skin.muted} onPress={onErase} disabled={disabled} reducedMotion={reducedMotion} accessibilityLabel={translate('challenge.erase')} />
              );
            }
            if (key === 'confirm') {
              return (
                <FlatKey key={key} label="=" color={skin.accent} onPress={onConfirm} disabled={disabled} dimmed={!canConfirm} reducedMotion={reducedMotion} accessibilityLabel={translate('challenge.confirm')} silent />
              );
            }
            return (
              <FlatKey key={key} label={key} color={skin.ink} onPress={() => onDigit(Number(key))} disabled={disabled} reducedMotion={reducedMotion} />
            );
          })}
        </View>
      ))}
    </View>
  );
}

type KeyProps = {
  label: string;
  color: string;
  onPress: () => void;
  disabled: boolean;
  reducedMotion: boolean;
  // Looks disabled but still takes taps: "=" before an answer shows, when
  // the digit may already be typed but not rendered yet. The press does
  // nothing if there's nothing to do.
  dimmed?: boolean;
  accessibilityLabel?: string;
  // No tap haptic: the answer's success or error haptic replaces it.
  silent?: boolean;
};

function FlatKey({ label, color, onPress, disabled, reducedMotion, dimmed = false, accessibilityLabel, silent = false }: KeyProps) {
  const { gesture, pressed, press } = useKeyGesture({ onPress, disabled, silent });
  const keyStyle = useAnimatedStyle(() => ({
    // Reduced motion keeps the halo and drops the shrink.
    transform: [{ scale: reducedMotion ? 1 : 1 - (1 - KEY_PRESSED_SCALE) * pressed.get() }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: pressed.get() }));
  return (
    <GestureDetector gesture={gesture}>
      <NativeView
        style={styles.fill}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: disabled || dimmed }}
        // Screen readers explore by touch: their double tap comes as an action.
        accessibilityActions={ACTIVATE_ACTION}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate' && !disabled)
            press();
        }}
      >
        <Animated.View style={[styles.key, keyStyle, (disabled || dimmed) && styles.keyDisabled]}>
          <Animated.View style={[styles.keyHalo, haloStyle]} />
          <Text style={[FONT, styles.keyLabel, { color }]}>{label}</Text>
        </Animated.View>
      </NativeView>
    </GestureDetector>
  );
}

type KeyGestureOptions = {
  onPress: () => void;
  disabled: boolean;
  silent: boolean;
};

// A key's touches, handled natively rather than by React Native's single
// touch responder. With the responder, a finger landing while another is
// still down (two thumbs rolling over the keypad) joined the first finger's
// press and was lost: on Android, it even counts as a touch on the first key.
// Here each key tracks its own fingers, fires as each one lands, and shows
// pressed on the UI thread, whatever React is busy with.
function useKeyGesture({ onPress, disabled, silent }: KeyGestureOptions) {
  const pressed = useSharedValue(0);
  // Fingers down on this key right now.
  const fingers = useSharedValue(0);
  // The latest onPress and disabled, so the gesture is built once rather than
  // on every render. A rebuilt gesture hands the native handler a new config
  // mid-touch, and `disabled` turns over under a finger: the last `=` of a
  // run ends it, so the keypad went disabled between that finger landing and
  // lifting. The handler never saw it lift — the key stayed pressed, its
  // finger count stuck above zero, and it was dead for the next run.
  // Disabled is a look and a screen reader's state: the reducer already
  // ignores every key once the run is over (use-challenge.ts).
  const latest = React.useRef({ onPress, disabled });
  React.useLayoutEffect(() => {
    latest.current = { onPress, disabled };
  });
  const press = React.useCallback(() => {
    if (latest.current.disabled)
      return;
    if (!silent)
      keyTapHaptic();
    latest.current.onPress();
  }, [silent]);

  const gesture = React.useMemo(() => {
    const lift = (count: number) => {
      'worklet';
      fingers.set(Math.max(0, fingers.get() - count));
      return fingers.get() === 0;
    };
    return Gesture.Manual()
      .onTouchesDown((event, manager) => {
        if (fingers.get() === 0) {
          manager.activate();
          pressed.set(1);
        }
        fingers.set(fingers.get() + event.changedTouches.length);
        // Two fingers on the same key, one after the other, type it twice.
        for (let i = 0; i < event.changedTouches.length; i++)
          scheduleOnRN(press);
      })
      .onTouchesUp((event, manager) => {
        if (lift(event.changedTouches.length))
          manager.end();
      })
      .onTouchesCancelled((event, manager) => {
        if (lift(event.changedTouches.length))
          manager.end();
      })
      .onFinalize(() => {
        fingers.set(0);
        pressed.set(withTiming(0, KEY_RELEASE));
      });
  }, [press, pressed, fingers]);

  return { gesture, pressed, press };
}

function Timer({ startedAt, finishedAt, color }: { startedAt: number | null; finishedAt: number | null; color: string }) {
  const [now, setNow] = React.useState(() => Date.now());
  const isRunning = startedAt !== null && finishedAt === null;
  React.useEffect(() => {
    if (!isRunning)
      return;
    const interval = setInterval(() => setNow(Date.now()), TIMER_TICK_MS);
    return () => clearInterval(interval);
  }, [isRunning]);
  const elapsed = startedAt === null ? 0 : Math.max(0, (finishedAt ?? now) - startedAt);
  return (
    <Text style={[FONT, styles.header, styles.timer, { color }]}>{formatElapsed(elapsed)}</Text>
  );
}

// 3, 2, 1 in the big number itself, one per second, each with its note as it
// shows, then the go note and onDone. Starts over for each run. 0 when not
// counting.
function useCountdown(active: boolean, onDone: () => void, runId: number) {
  const [step, setStep] = React.useState({ runId, count: COUNT_FROM });
  const count = step.runId === runId ? step.count : COUNT_FROM;
  const { playCount, playGo } = useCountdownSounds();
  React.useEffect(() => {
    if (!active)
      return;
    AccessibilityInfo.announceForAccessibility(String(count));
    playCount(count);
    countdownTickHaptic();
    const timeout = setTimeout(() => {
      if (count > 1) {
        setStep({ runId, count: count - 1 });
      }
      else {
        playGo();
        countdownGoHaptic();
        onDone();
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [active, count, onDone, runId, playCount, playGo]);
  return active ? count : 0;
}

type Flash = NumberFeedback & { value: string };

// The answer just confirmed, kept for FLASH_MS so the big number can show it
// green or red before it flies out.
function useFlash() {
  const [flash, setFlash] = React.useState<Flash | null>(null);
  React.useEffect(() => {
    if (!flash)
      return;
    const timeout = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(timeout);
  }, [flash]);
  return [flash, setFlash] as const;
}

// The results come RESULTS_DELAY_MS after the last answer, with their chord.
function useShowResults(isFinished: boolean, runId: number) {
  const [resultsRunId, setResultsRunId] = React.useState<number | null>(null);
  const playResultsSound = useResultsSound();
  React.useEffect(() => {
    if (!isFinished)
      return;
    const timeout = setTimeout(() => {
      setResultsRunId(runId);
      playResultsSound();
    }, RESULTS_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [isFinished, runId, playResultsSound]);
  return isFinished && resultsRunId === runId;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    fontSize: 26,
    lineHeight: 34,
    paddingVertical: 8,
  },
  timer: {
    fontVariant: ['tabular-nums'],
  },
  key: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDisabled: {
    opacity: 0.35,
  },
  keyHalo: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  keyLabel: {
    fontSize: 44,
    lineHeight: 52,
  },
});
