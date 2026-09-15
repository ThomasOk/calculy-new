import type { Problem } from '@/features/challenge/problems';
import type { ChallengeState } from '@/features/challenge/use-challenge';
import { act, renderHook } from '@testing-library/react-native';
import { challengeReducer, correctStreak, createChallengeState, useChallenge } from '@/features/challenge/use-challenge';

const PROBLEMS: Problem[] = [
  { left: 1, operator: 'times', right: 3, answer: 3 },
  { left: 3, operator: 'times', right: 4, answer: 12 },
];

function started(problems = PROBLEMS, now = 1000) {
  return challengeReducer(createChallengeState(problems), { type: 'start', now });
}

function typeDigits(state: ChallengeState, digits: string) {
  return [...digits].reduce(
    (current, digit) => challengeReducer(current, { type: 'digit', digit: Number(digit) }),
    state,
  );
}

function answer(state: ChallengeState, digits: string, now = 2000) {
  return challengeReducer(typeDigits(state, digits), { type: 'confirm', now });
}

describe('challengeReducer', () => {
  it('starts the clock once', () => {
    const state = challengeReducer(started(PROBLEMS, 1000), { type: 'start', now: 2000 });
    expect(state.startedAt).toBe(1000);
  });

  it('ignores digits until started', () => {
    const state = createChallengeState(PROBLEMS);
    expect(typeDigits(state, '1')).toBe(state);
  });

  it('replaces a leading zero and caps the answer length', () => {
    expect(typeDigits(started(), '05').input).toBe('5');
    expect(typeDigits(started(), '123456').input).toBe('1234');
  });

  it('erases the last digit', () => {
    const state = challengeReducer(typeDigits(started(), '12'), { type: 'erase' });
    expect(state.input).toBe('1');
  });

  it('ignores confirm without an answer', () => {
    const state = started();
    expect(challengeReducer(state, { type: 'confirm', now: 0 })).toBe(state);
  });

  it('records the answer and moves to the next problem', () => {
    const state = answer(started(), '4');
    expect(state.answers).toEqual([4]);
    expect(state.currentIndex).toBe(1);
    expect(state.input).toBe('');
    expect(state.finishedAt).toBeNull();
  });

  it('stops the clock after the last problem and ignores further input', () => {
    const state = answer(answer(started(), '3'), '12', 5000);
    expect(state.finishedAt).toBe(5000);
    expect(typeDigits(state, '1')).toBe(state);
  });

  it('restarts from scratch with a new run id, waiting for a new start', () => {
    const state = challengeReducer(answer(started(), '3'), { type: 'restart', problems: PROBLEMS });
    expect(state).toEqual(createChallengeState(PROBLEMS, 1));
  });
});

describe('useChallenge', () => {
  it('confirms every digit typed so far, even those not rendered yet', () => {
    const onAnswer = jest.fn();
    const { result } = renderHook(() => useChallenge({ problemCount: 2, onAnswer }));
    const expected = result.current.state.problems[0]!.answer === 22;

    // Keys fired in a row from the UI thread: no render between them.
    let confirmed: ReturnType<typeof result.current.confirm> = null;
    act(() => {
      const { start, pressDigit, confirm } = result.current;
      start();
      pressDigit(2);
      pressDigit(2);
      confirmed = confirm();
    });

    expect(confirmed).toEqual({ value: '22', correct: expected });
    expect(onAnswer).toHaveBeenCalledWith(expected, expected ? 1 : 0);
    expect(result.current.state.answers).toEqual([22]);
  });
});

describe('correctStreak', () => {
  it('counts the correct answers since the last mistake', () => {
    let state = started([...PROBLEMS, { left: 2, operator: 'times', right: 2, answer: 4 }]);
    expect(correctStreak(state)).toBe(0);

    state = answer(state, '3');
    expect(correctStreak(state)).toBe(1);
    state = answer(state, '12');
    expect(correctStreak(state)).toBe(2);
    state = answer(state, '5');
    expect(correctStreak(state)).toBe(0);
  });
});
