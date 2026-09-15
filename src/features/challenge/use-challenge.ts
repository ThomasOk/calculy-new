import type { Problem } from '@/features/challenge/problems';
import * as React from 'react';
import { generateProblems } from '@/features/challenge/problems';

const MAX_INPUT_LENGTH = 4;

export type ChallengeState = {
  runId: number;
  problems: Problem[];
  answers: number[];
  currentIndex: number;
  input: string;
  startedAt: number | null;
  finishedAt: number | null;
};

export type ChallengeAction
  = | { type: 'start'; now: number }
    | { type: 'digit'; digit: number }
    | { type: 'erase' }
    | { type: 'confirm'; now: number }
    | { type: 'restart'; problems: Problem[] };

export function createChallengeState(problems: Problem[], runId = 0): ChallengeState {
  return {
    runId,
    problems,
    answers: [],
    currentIndex: 0,
    input: '',
    startedAt: null,
    finishedAt: null,
  };
}

function isStarted(state: ChallengeState) {
  return state.startedAt !== null;
}

function isFinished(state: ChallengeState) {
  return state.currentIndex >= state.problems.length;
}

function isConfirmable(state: ChallengeState) {
  return isStarted(state) && !isFinished(state) && state.input !== '';
}

export function challengeReducer(state: ChallengeState, action: ChallengeAction): ChallengeState {
  switch (action.type) {
    case 'start':
      // Sent when the countdown ends, together with the calculations
      // appearing: reading the first one is part of the time.
      return isStarted(state) ? state : { ...state, startedAt: action.now };
    case 'digit': {
      if (!isStarted(state) || isFinished(state) || state.input.length >= MAX_INPUT_LENGTH)
        return state;
      return {
        ...state,
        input: state.input === '0' ? String(action.digit) : `${state.input}${action.digit}`,
      };
    }
    case 'erase':
      return state.input === '' ? state : { ...state, input: state.input.slice(0, -1) };
    case 'confirm': {
      if (!isConfirmable(state))
        return state;
      const currentIndex = state.currentIndex + 1;
      return {
        ...state,
        answers: [...state.answers, Number(state.input)],
        currentIndex,
        input: '',
        finishedAt: currentIndex >= state.problems.length ? action.now : null,
      };
    }
    case 'restart':
      return createChallengeState(action.problems, state.runId + 1);
  }
}

// Consecutive correct answers at the end of the run so far.
export function correctStreak(state: ChallengeState) {
  let streak = 0;
  for (let index = state.answers.length - 1; index >= 0; index--) {
    if (state.answers[index] !== state.problems[index]?.answer)
      break;
    streak++;
  }
  return streak;
}

type Options = {
  problemCount: number;
  // streak counts the correct answers in a row ending with this one, and is
  // 0 for a wrong answer.
  onAnswer?: (isCorrect: boolean, streak: number) => void;
};

export type ConfirmedAnswer = { value: string; correct: boolean };

export function useChallenge({ problemCount, onAnswer }: Options) {
  const [state, setState] = React.useState(() => createChallengeState(generateProblems(problemCount)));
  // The state after every action so far, rendered or not: keys can fire
  // faster than React renders (from the UI thread, as the Not Boring keypad
  // does), and each must see the ones before it.
  const latest = React.useRef(state);

  const send = React.useCallback((action: ChallengeAction) => {
    latest.current = challengeReducer(latest.current, action);
    setState(latest.current);
  }, []);

  const actions = React.useMemo(
    () => ({
      start: () => send({ type: 'start', now: Date.now() }),
      pressDigit: (digit: number) => send({ type: 'digit', digit }),
      erase: () => send({ type: 'erase' }),
      restart: () => send({ type: 'restart', problems: generateProblems(problemCount) }),
    }),
    [send, problemCount],
  );

  // The answer confirmed, or null when there was nothing to confirm.
  const confirm = React.useCallback((): ConfirmedAnswer | null => {
    const current = latest.current;
    if (!isConfirmable(current))
      return null;
    // Reported from the tap itself rather than an effect after the render, so
    // feedback like a sound starts together with the row changing color.
    const correct = Number(current.input) === current.problems[current.currentIndex]?.answer;
    onAnswer?.(correct, correct ? correctStreak(current) + 1 : 0);
    send({ type: 'confirm', now: Date.now() });
    return { value: current.input, correct };
  }, [send, onAnswer]);

  const score = state.answers.filter(
    (answer, index) => answer === state.problems[index]?.answer,
  ).length;

  return {
    state,
    isStarted: isStarted(state),
    isFinished: isFinished(state),
    canConfirm: isConfirmable(state),
    score,
    confirm,
    ...actions,
  };
}
