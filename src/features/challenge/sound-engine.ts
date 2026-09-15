import type { AudioBuffer } from 'react-native-audio-api';
import { AppState } from 'react-native';
import { AudioContext, AudioManager } from 'react-native-audio-api';
import { nextVariant } from '@/features/challenge/sound-variants';

// Short sounds on one audio output, kept open while the app is in front,
// each decoded once into memory: a sound starts at once however short it is
// (the menu's cards are 22 ms), however soon after the last one, and several
// overlap. A media player per sound (expo-audio, before) warmed up on its
// first play while Android's output woke from standby: the menu's clicks
// went unheard, and so did some answers given in quick succession.

// A sound asked for while it's still decoding (the first moments of a
// launch; longer in development, where it comes from Metro) plays once
// decoded, unless that's more than this after it was asked for: too late
// to go with its gesture, it's dropped.
const MAX_LATE_MS = 150;

let context: AudioContext | null = null;

function audioContext() {
  if (context)
    return context;
  // Mixes with the user's music instead of stopping it, and stays quiet when
  // the phone is on silent.
  AudioManager.setAudioSessionOptions({ iosCategory: 'ambient', iosMode: 'default', iosOptions: [] });
  const created = new AudioContext();
  // Opened now rather than on the first sound, and kept open: no sound
  // waits on it.
  created.resume();
  // Closed in the background, where nothing plays, for the battery.
  AppState.addEventListener('change', (state) => {
    if (state === 'background')
      created.suspend();
    else if (state === 'active')
      created.resume();
  });
  context = created;
  return created;
}

// The variants of one sound, as imported assets, decoded as soon as it's
// made: once per app run (use-sound-bank.ts keeps each), not per mount.
export function createSoundBank(sources: readonly number[]) {
  const audio = audioContext();
  const buffers: (AudioBuffer | null)[] = sources.map(() => null);
  const decoding = sources.map((source, index) =>
    audio.decodeAudioData(source).then(
      (buffer) => {
        buffers[index] = buffer;
        return buffer;
      },
      (error: unknown) => {
        console.warn(`Couldn't decode sound ${index} of its bank`, error);
        return null;
      },
    ));
  let last: number | null = null;

  // A new source for each play, as Web Audio means them: it goes once, and
  // overlaps whatever else is playing.
  const start = (buffer: AudioBuffer) => {
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start();
  };

  const play = (index: number) => {
    const buffer = buffers[index];
    if (buffer) {
      start(buffer);
      return;
    }
    const askedAt = Date.now();
    decoding[index]?.then((decoded) => {
      if (decoded && Date.now() - askedAt <= MAX_LATE_MS)
        start(decoded);
    });
  };

  return {
    play,
    // A variant at random, never the one just played.
    playNext: () => {
      last = nextVariant(sources.length, last);
      play(last);
    },
  };
}
