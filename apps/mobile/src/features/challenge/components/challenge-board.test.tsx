import * as React from 'react';
import { ChallengeBoard } from '@/features/challenge/components/challenge-board';
import { act, fireEvent, render, screen, within } from '@/lib/test-utils';

const mockPlayAnswerSound = jest.fn();
const mockAnswerHaptic = jest.fn();
const mockKeyTapHaptic = jest.fn();
const mockQuit = jest.fn();

jest.mock('@/features/challenge/use-answer-sounds', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- stands in for the real hook
  useAnswerSounds: () => mockPlayAnswerSound,
}));

jest.mock('@/features/challenge/haptics', () => ({
  answerHaptic: (isCorrect: boolean) => mockAnswerHaptic(isCorrect),
  keyTapHaptic: () => mockKeyTapHaptic(),
}));

jest.mock('@/features/challenge/problems', () => ({
  ...jest.requireActual('@/features/challenge/problems'),
  generateProblems: () => [
    { left: 1, operator: 'times', right: 3, answer: 3 },
    { left: 3, operator: 'times', right: 4, answer: 12 },
  ],
}));

// One step per act: each number schedules the next once it has rendered.
function advanceCountdown(steps = 3) {
  for (let step = 0; step < steps; step++)
    act(() => jest.advanceTimersByTime(1000));
}

function countdownNumber(label: string) {
  return within(screen.getByTestId('challenge-countdown')).getByText(label);
}

function layoutCarousel() {
  // The carousel only renders its rows once it knows its height.
  fireEvent(screen.getByTestId('problem-carousel'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 300 } },
  });
}

function board({ ready = true } = {}) {
  return <ChallengeBoard problemCount={2} onQuit={mockQuit} ready={ready} />;
}

function renderBoard() {
  render(board());
  advanceCountdown();
  layoutCarousel();
}

function answer(digits: string) {
  for (const digit of digits)
    fireEvent.press(screen.getByLabelText(digit));
  fireEvent.press(screen.getByLabelText('Confirm'));
}

// The results wait a beat after the last answer.
function waitForResults() {
  act(() => jest.advanceTimersByTime(600));
}

function finishRun() {
  renderBoard();
  answer('3');
  answer('11');
  waitForResults();
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPlayAnswerSound.mockClear();
  mockAnswerHaptic.mockClear();
  mockKeyTapHaptic.mockClear();
  mockQuit.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('challengeBoard countdown', () => {
  it('counts down from 3 before showing the calculations', () => {
    render(board());
    expect(countdownNumber('3')).toBeTruthy();

    advanceCountdown(1);
    expect(countdownNumber('2')).toBeTruthy();

    advanceCountdown(1);
    expect(countdownNumber('1')).toBeTruthy();

    advanceCountdown(1);
    expect(screen.queryByTestId('challenge-countdown')).toBeNull();
  });

  it('holds the countdown until the screen is ready', () => {
    const { rerender } = render(board({ ready: false }));
    advanceCountdown();
    expect(screen.queryByTestId('challenge-countdown')).toBeNull();

    rerender(board());
    expect(countdownNumber('3')).toBeTruthy();
  });

  it('ignores the keypad during the countdown', () => {
    render(board());
    fireEvent.press(screen.getByLabelText('3', { includeHiddenElements: true }));

    advanceCountdown();
    layoutCarousel();

    expect(screen.getByText('1 × 3 =')).toBeTruthy();
  });

  it('can be quit during the countdown and during the run', () => {
    render(board());
    fireEvent.press(screen.getByLabelText('Quit'));
    expect(mockQuit).toHaveBeenCalledTimes(1);

    advanceCountdown();
    fireEvent.press(screen.getByLabelText('Quit'));
    expect(mockQuit).toHaveBeenCalledTimes(2);
  });

  it('counts down again after a restart', () => {
    finishRun();

    fireEvent.press(screen.getByText('Restart'));

    expect(countdownNumber('3')).toBeTruthy();
    expect(screen.queryByText('Finished!')).toBeNull();
  });
});

describe('challengeBoard', () => {
  it('moves to the next calculation after confirming an answer', () => {
    renderBoard();
    expect(screen.getByText('1 × 3 =')).toBeTruthy();

    answer('3');

    expect(screen.getByText('1 × 3 = 3')).toBeTruthy();
    expect(screen.getByText('3 × 4 =')).toBeTruthy();
  });

  it('plays the matching sound for each answer', () => {
    renderBoard();

    answer('3');
    expect(mockPlayAnswerSound).toHaveBeenLastCalledWith(true);

    answer('11');
    expect(mockPlayAnswerSound).toHaveBeenLastCalledWith(false);
    expect(mockPlayAnswerSound).toHaveBeenCalledTimes(2);
  });

  it('plays the matching haptic for each answer', () => {
    renderBoard();

    answer('3');
    expect(mockAnswerHaptic).toHaveBeenLastCalledWith(true);

    answer('11');
    expect(mockAnswerHaptic).toHaveBeenLastCalledWith(false);
    expect(mockAnswerHaptic).toHaveBeenCalledTimes(2);
  });

  it('ticks on digit and erase keys but not on confirm', () => {
    renderBoard();

    fireEvent(screen.getByLabelText('3'), 'pressIn');
    fireEvent(screen.getByLabelText('Erase'), 'pressIn');
    expect(mockKeyTapHaptic).toHaveBeenCalledTimes(2);

    fireEvent.press(screen.getByLabelText('3'));
    fireEvent(screen.getByLabelText('Confirm'), 'pressIn');
    expect(mockKeyTapHaptic).toHaveBeenCalledTimes(2);
  });

  it('fills the progress bar as calculations are confirmed', () => {
    renderBoard();
    const progress = screen.getByRole('progressbar');
    expect(progress.props.accessibilityValue).toEqual({ min: 0, max: 2, now: 0 });

    answer('3');
    expect(progress.props.accessibilityValue).toEqual({ min: 0, max: 2, now: 1 });

    answer('11');
    expect(progress.props.accessibilityValue).toEqual({ min: 0, max: 2, now: 2 });
  });

  it('shows the results a beat after the last answer', () => {
    renderBoard();

    answer('3');
    answer('11');
    expect(screen.queryByText('Finished!')).toBeNull();

    waitForResults();
    expect(screen.getByText('Finished!')).toBeTruthy();
    expect(screen.getByLabelText('Correct, 1')).toBeTruthy();
    expect(screen.getByLabelText('Mistakes, 1')).toBeTruthy();
    expect(screen.getByLabelText(/^Time, \d{2}:\d{2}\.\d{2}$/)).toBeTruthy();
  });

  it('hides the board behind the results', () => {
    finishRun();

    expect(screen.queryByTestId('problem-carousel')).toBeNull();
    expect(screen.queryByLabelText('Confirm')).toBeNull();
  });

  it('goes back to the challenges from the results', () => {
    finishRun();

    fireEvent.press(screen.getByText('Back to challenges'));

    expect(mockQuit).toHaveBeenCalledTimes(1);
  });
});
