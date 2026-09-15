import * as React from 'react';
import { HomeScreen } from '@/features/home/home-screen';
import { fireEvent, render, screen } from '@/lib/test-utils';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- stands in for the real hook
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default);

// The fonts load asynchronously; the screen waits for them.
jest.mock('@/features/challenge/prototype-not-boring/pagaille-style', () => ({
  ...jest.requireActual('@/features/challenge/prototype-not-boring/pagaille-style'),
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- stands in for the real hook
  usePagailleFonts: () => true,
}));

// The sounds load native players: stood in for, and listened to.
const mockSounds = {
  playEntry: jest.fn(),
  playCard: jest.fn(),
  playSheet: jest.fn(),
  playStart: jest.fn(),
  playCancel: jest.fn(),
};

jest.mock('@/features/home/use-menu-sounds', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- stands in for the real hook
  useMenuSounds: () => mockSounds,
}));

function challengeButton(title: string) {
  return screen.getByRole('button', { name: new RegExp(`^${title},`) });
}

function selectChallenge(title: string) {
  fireEvent.press(challengeButton(title));
}

describe('homeScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    Object.values(mockSounds).forEach(play => play.mockClear());
  });

  it('plays the title\'s sound as it comes in', () => {
    render(<HomeScreen />);

    expect(mockSounds.playEntry).toHaveBeenCalledTimes(1);
  });

  it('plays a card\'s own sound as the finger lands on it', () => {
    render(<HomeScreen />);

    fireEvent(challengeButton('Calculy 30'), 'pressIn');

    expect(mockSounds.playCard).toHaveBeenCalledWith(1);
  });

  it('plays the start sound once on a double tap', () => {
    render(<HomeScreen />);

    selectChallenge('Calculy 20');
    fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    fireEvent.press(screen.getByRole('button', { name: 'Start' }));

    expect(mockSounds.playStart).toHaveBeenCalledTimes(1);
  });

  it('describes the selected challenge', () => {
    render(<HomeScreen />);

    selectChallenge('Calculy 30');

    expect(screen.getByRole('header', { name: 'Calculy 30' })).toBeTruthy();
  });

  it('starts the selected challenge on start', () => {
    render(<HomeScreen />);

    selectChallenge('Calculy 30');
    fireEvent.press(screen.getByRole('button', { name: 'Start' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/challenge/[id]',
      params: { id: 'calculy-30' },
    });
  });

  it('starts the challenge once on a double tap', () => {
    render(<HomeScreen />);

    selectChallenge('Calculy 20');
    fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    fireEvent.press(screen.getByRole('button', { name: 'Start' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('stays home on cancel', () => {
    render(<HomeScreen />);

    selectChallenge('Calculy 20');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockPush).not.toHaveBeenCalled();
  });
});
