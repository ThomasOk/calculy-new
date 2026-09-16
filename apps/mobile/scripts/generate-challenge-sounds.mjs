// Renders the challenge's sounds to WAV: the "Acid jazz" direction of the
// Pagaille sound bench (https://claude.ai/code/artifact/5af90a67-96e7-4b0d-8ab7-ebc0b2d8bab9),
// with "Cadence" for the correct answer. They are rendered the way Web Audio
// played them there (linear attack, exponential decay, biquad filters,
// exponential sweeps, band-limited sawtooths, FM), so the app sounds like
// what was picked.
//
// A repeated sound comes in variants, which the app plays at random, never
// the same twice in a row (sound-variants.ts). In a streak, the correct
// answer plays with the milestone's layer on top: two files at once.
//
// It also renders the home menu's sounds (src/features/home/sounds), leveled
// under the challenge's countdown: see "The home menu" below.
//
//   pnpm sounds:challenge

import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/features/challenge/sounds');
// Peak of the loudest sound.
const PEAK_DB = -1;
// Keypad sounds, leveled by what a phone speaker plays of them (phoneLevel
// below) rather than by their peak, this many dB under the correct answer.
// Empty: the erase key keeps the bench's balance.
const REFERENCE = 'jazz-correct-1.wav';
const KEY_LEVELS = {};
// Level the exponential decays reach at their end, as on the bench.
const FLOOR = 0.0005;
// Modes above this are inaudible on a phone; the bench skipped them too.
const MAX_HZ = 15000;
// A band-limited sawtooth's harmonics stop here.
const SAW_TOP_HZ = 20000;

const NOTE_INDEX = { 'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2 };
function hz(name) {
  const [, note, octave] = /^([A-G]#?)(\d)$/.exec(name);
  return 440 * 2 ** ((NOTE_INDEX[note] + (Number(octave) - 4) * 12) / 12);
}
const cents = c => 2 ** (c / 1200);

// The bench's seeded random, for the wrong answer's variants.
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Voices: t start (s), a attack, d decay, g gain, and either an oscillator
// (f; wave 'sine' or 'sawtooth'; glide {to, time}; detune in cents; fm
// {ratio, index, decay}; filter) or noise (a filter: type, frequency f, Q q,
// optionally the frequency it sweeps to over `time`, and an offset in
// seconds into the noise).

// ---------- The band ----------

// An electric piano: FM at ratio 1, its brightness dying faster than its
// tone, a tine's bark on top and the hammer's knock. A lower index is a
// lighter touch.
function rhodes(t, f, { g, decay, index = 1.4 }) {
  return [
    { t, f, fm: { ratio: 1, index, decay: decay * 0.35 }, a: 0.002, d: decay, g },
    { t, f: f * 7.1, a: 0.0006, d: 0.03, g: g * 0.12 },
    { t, noise: { type: 'bandpass', f: 3000, q: 1.5, offset: 2.2 }, a: 0.0005, d: 0.004, g: g * 0.25 },
  ];
}

// A brass stab: two detuned saws per note, scooping up into pitch, their
// filter closing.
function brass(t, notes, { g, d, open = 4500, close = 1100, time = 0.12 }) {
  return notes.flatMap(note => [-7, 7].map(detune => ({
    t,
    f: hz(note) * 0.97,
    glide: { to: hz(note), time: 0.03 },
    wave: 'sawtooth',
    detune,
    filter: { type: 'lowpass', f: open, to: close, time, q: 3 },
    a: 0.005,
    d,
    g: g / 2,
  })));
}

function snap(t, g, { f = 2100, offset = 0.3 } = {}) {
  return [
    { t, noise: { type: 'bandpass', f, q: 2.5, offset }, a: 0.0008, d: 0.035, g },
    { t, noise: { type: 'bandpass', f: 1100, q: 1.2, offset: offset + 0.1 }, a: 0.0008, d: 0.014, g: g * 0.45 },
    { t, noise: { type: 'highpass', f: 5000, q: 0.7, offset: offset + 0.2 }, a: 0.0004, d: 0.005, g: g * 0.3 },
  ];
}

function hat(t, g, { d = 0.03, f = 7500, offset = 0.6 } = {}) {
  return [
    { t, noise: { type: 'highpass', f, q: 0.7, offset }, a: 0.0005, d, g },
    { t, noise: { type: 'bandpass', f: 10000, q: 1, offset: offset + 0.05 }, a: 0.0005, d: d * 0.7, g: g * 0.5 },
  ];
}

function crash(t, g, d = 0.9) {
  return [
    { t, noise: { type: 'highpass', f: 4500, q: 0.7, offset: 0.9 }, a: 0.003, d, g },
    { t, noise: { type: 'bandpass', f: 7500, q: 0.8, offset: 1.2 }, a: 0.002, d: d * 0.6, g: g * 0.6 },
  ];
}

// A body an octave or two under the chord: lost on a phone, felt on
// headphones.
function bass(t, g, d) {
  return [{ t, f: hz('E3'), wave: 'sawtooth', filter: { type: 'lowpass', f: 900, q: 1 }, a: 0.005, d, g }];
}

// A record scratched back then forth: two strokes, each swelling then cut.
function scratch(t, g, { offset, speed = 1 }) {
  const back = 0.065 / speed;
  const forth = 0.055 / speed;
  const t2 = t + back + 0.006;
  const stroke = { type: 'bandpass', f: 1400, q: 1 };
  return [
    { t, noise: { type: 'bandpass', f: 2600, to: 700, time: back, q: 2.2, offset }, a: back * 0.6, d: back * 0.4, g },
    { t, f: 420, glide: { to: 160, time: back }, wave: 'sawtooth', filter: stroke, a: back * 0.6, d: back * 0.4, g: g * 0.5 },
    { t: t2, noise: { type: 'bandpass', f: 800, to: 2400, time: forth, q: 2.2, offset: offset + 0.3 }, a: forth * 0.6, d: forth * 0.4, g: g * 0.8 },
    { t: t2, f: 170, glide: { to: 430, time: forth }, wave: 'sawtooth', filter: stroke, a: forth * 0.6, d: forth * 0.4, g: g * 0.4 },
  ];
}

// ---------- The sounds ----------

// The correct answer, "Cadence": two notes that lean, then the E chord they
// lean into, on the Rhodes touched lighter. Eight ways to lean.
const TOUCH = 1.1;
const LEANS = [
  [['A5', 'D#6'], ['G#5', 'E6']],
  [['A5', 'C#6'], ['G#5', 'B5']],
  [['F#5', 'A5'], ['E5', 'G#5']],
  [['D#6', 'A6'], ['E6', 'G#6']],
  [['C#6', 'F#6'], ['B5', 'E6']],
  [['A5', 'D#6'], ['B5', 'E6']],
  [['F#5', 'C#6'], ['G#5', 'B5']],
  [['A5', 'F#6'], ['G#5', 'E6']],
];
const ARRIVAL = 0.1;
function cadence(i) {
  const [lean, land] = LEANS[i];
  return [
    ...lean.flatMap(note => rhodes(0, hz(note), { g: 0.18, decay: 0.3, index: TOUCH })),
    ...land.flatMap((note, k) => rhodes(ARRIVAL + k * 0.006, hz(note), { g: 0.24, decay: 0.9, index: TOUCH })),
  ];
}
// The bench leveled every take of the correct answer on the first round's
// chord, E maj9 on the Rhodes with a snap: Cadence peaks where it did.
const FIRST_CHORD = [
  ...snap(0, 0.5, { f: 2000, offset: 0.3 }),
  ...['G#5', 'B5', 'D#6', 'F#6'].flatMap((note, k) => rhodes(0.004 + k * 0.009, hz(note), { g: 0.2, decay: 0.42 })),
];

// The wrong answer: a brass "fall", the note holding, then falling a
// tritone as it dies.
function fall(i) {
  const r = rng(i + 101);
  const top = hz('B5') * cents((r() - 0.5) * 20);
  return [
    { t: 0, f: top, wave: 'sawtooth', detune: -6, filter: { type: 'lowpass', f: 2600, q: 1 }, a: 0.008, d: 0.09, g: 0.26 },
    { t: 0.05, f: top, glide: { to: top * (0.68 + r() * 0.06), time: 0.17 }, wave: 'sawtooth', detune: 6, filter: { type: 'lowpass', f: 2200, to: 600, time: 0.2, q: 1 }, a: 0.012, d: 0.2, g: 0.3 },
    { t: 0, noise: { type: 'bandpass', f: 3000, q: 0.8, offset: 0.2 + i * 0.1 }, a: 0.02, d: 0.1, g: 0.14 },
  ];
}

// A streak's milestone layer, played over the correct answer: the band
// joins in, a hi-hat, then brass, a melody note, shakers, and at the top a
// cymbal.
function streakLayer(level) {
  return [
    ...hat(0.11, 0.35, { d: level >= 3 ? 0.12 : 0.03 }),
    ...(level >= 2 ? brass(0.004, ['B5', 'D#6', 'F#6'], { g: 0.16, d: 0.16 }) : []),
    ...(level >= 3 ? rhodes(0.11, hz('E7'), { g: 0.12, decay: 0.3 }) : []),
    ...(level >= 4 ? [0.055, 0.165].flatMap(t => hat(t, 0.18, { offset: 0.8 + t })) : []),
    ...(level >= 5 ? [...crash(0.004, 0.14, 0.6), ...rhodes(0.165, hz('G#7'), { g: 0.1, decay: 0.3 })] : []),
  ];
}

// The countdown: finger snaps with a Rhodes note up the E chord, then the
// whole band on the go.
const COUNT = { 3: ['E5', 1900], 2: ['G#5', 2100], 1: ['B5', 2300] };
function count(step) {
  const [note, snapHz] = COUNT[step];
  return [...snap(0, 0.6, { f: snapHz }), ...hat(0, 0.15), ...rhodes(0.004, hz(note), { g: 0.14, decay: 0.35 })];
}
const GO_CHORD = ['G#5', 'B5', 'C#6', 'E6'];

const SOUNDS = {
  ...Object.fromEntries(LEANS.map((_, i) => [`jazz-correct-${i + 1}.wav`, { correct: i }])),
  ...Object.fromEntries([0, 1, 2, 3].map(i => [`jazz-wrong-${i + 1}.wav`, fall(i)])),
  ...Object.fromEntries([1, 2, 3, 4, 5].map(level => [`jazz-streak-${level}.wav`, streakLayer(level)])),
  ...Object.fromEntries([3, 2, 1].map(step => [`jazz-countdown-${step}.wav`, count(step)])),
  'jazz-countdown-go.wav': [
    ...brass(0, GO_CHORD, { g: 0.24, d: 0.35, open: 5000, close: 1400, time: 0.2 }),
    ...GO_CHORD.flatMap(note => rhodes(0.004, hz(note), { g: 0.14, decay: 0.8 })),
    ...snap(0, 0.5),
    ...crash(0, 0.16, 0.8),
    ...bass(0, 0.25, 0.3),
  ],
  // A run up the Rhodes, then the chord with brass and cymbal.
  'jazz-results.wav': [
    ...['E5', 'F#5', 'G#5', 'B5', 'C#6', 'D#6', 'E6', 'F#6', 'G#6'].flatMap((note, k) => rhodes(k * 0.038, hz(note), { g: 0.12, decay: 0.3 })),
    ...['B5', 'D#6', 'F#6', 'G#6', 'B6'].flatMap((note, k) => rhodes(0.36 + k * 0.01, hz(note), { g: 0.13, decay: 1.5 })),
    ...brass(0.36, ['G#5', 'B5', 'D#6', 'F#6'], { g: 0.22, d: 0.7, open: 5000, close: 1500, time: 0.35 }),
    ...snap(0.36, 0.5),
    ...crash(0.36, 0.18, 1.4),
    ...bass(0.36, 0.25, 0.6),
  ],
  // The erase key: a record scratched back. The digits have none, and "="
  // neither: the answer's sound replaces it.
  ...Object.fromEntries([0, 1, 2, 3].map(i => [`jazz-erase-${i + 1}.wav`, scratch(0, 0.9, { offset: 0.1 + i * 0.12, speed: 1 + ((i % 4) - 1.5) * 0.06 })])),
};

// ---------- The home menu ----------

// The "Rythmique" direction of the menu's bench
// (https://claude.ai/artifact/TQXbMPa4iu7PcHe7iNz4Sa), with Start tried on
// "Cuivres" (2026-09-15), "Riff montant" (a Cuivres variant, from a second
// bench: https://claude.ai/artifact/77a5vF9s7jaq4SdkY5Wphm), then Rhodes's
// own Start — none of them fit. Now playing Rhodes's *Fenêtre* chord
// instead: the arpeggio the sheet's count stamps down to, borrowed for
// Start. Still resolves into the countdown's first note, an E.
// The results screen reuses this file for Restart (not-boring-challenge.tsx,
// RESTART_SOUND): both are "start a run", so both get the same cue.

// A rubber stamp coming down: its knock, where a phone speaker still plays,
// over a thud only headphones carry.
function stamp(t, g, offset = 0.5) {
  return [
    { t, noise: { type: 'bandpass', f: 1300, q: 1.4, offset }, a: 0.0006, d: 0.03, g },
    { t, noise: { type: 'bandpass', f: 3400, q: 1, offset: offset + 0.15 }, a: 0.0004, d: 0.008, g: g * 0.3 },
    { t, f: 180, glide: { to: 70, time: 0.06 }, a: 0.001, d: 0.08, g: g * 0.9 },
  ];
}

// A stick on the snare's rim: short, bright, a little pitched.
function rim(t, g, { f = 1700, offset = 0.4 } = {}) {
  return [
    { t, noise: { type: 'bandpass', f, q: 6, offset }, a: 0.0004, d: 0.022, g },
    { t, f: f * 0.5, a: 0.0005, d: 0.014, g: g * 0.3 },
    { t, noise: { type: 'highpass', f: 6000, q: 0.7, offset: offset + 0.1 }, a: 0.0003, d: 0.004, g: g * 0.3 },
  ];
}

// A brush swept over the snare. Up, it swells and is cut as it arrives;
// down, it starts at once and dies away: the gestures that open and close.
function sweep(t, g, { from, to, time, offset }) {
  const up = to > from;
  return [
    { t, noise: { type: 'bandpass', f: from, to, time, q: 1.1, offset }, a: up ? time * 0.75 : 0.01, d: up ? time * 0.35 : time, g },
    { t, noise: { type: 'highpass', f: 5000, q: 0.7, offset: offset + 0.4 }, a: up ? time * 0.75 : 0.01, d: time * 0.3, g: g * 0.15 },
  ];
}

// When the home screen's title and cards land, in seconds from its mount
// (home-title.tsx, challenge-card.tsx): the name's plate and the heading's
// arrive, the two cut letters are stamped down, then each card's count.
const LANDS = { name: 0.14, heading: 0.25, cutC: 0.38, cutA: 0.415, cards: [0.66, 0.72] };
// Around 0, for variants: -1.5, -0.5, 0.5, 1.5 for four.
const spread = (i, n) => (i % n) - (n - 1) / 2;
// Each card's stick on the rim, higher for the second.
const CARD_HZ = [1650, 1950];

const MENU_SOUNDS = {
  // The bolt's brush up, a snap per plate, the stamp on the cut C, a rim on
  // the boxed A, a hi-hat per card.
  'menu-entry.wav': [
    ...sweep(0, 0.55, { from: 700, to: 3600, time: 0.14, offset: 0.4 }),
    ...snap(LANDS.name, 0.45, { f: 1950, offset: 0.3 }),
    ...snap(LANDS.heading, 0.38, { f: 2250, offset: 0.55 }),
    ...stamp(LANDS.cutC, 0.6),
    ...rim(LANDS.cutA, 0.35, { f: 1900, offset: 0.7 }),
    ...LANDS.cards.flatMap((t, k) => hat(t, 0.22, { offset: 0.9 + k * 0.1 })),
  ],
  ...Object.fromEntries(CARD_HZ.flatMap((f, card) => [0, 1, 2, 3].map(i => [
    `menu-card-${card + 1}-${i + 1}.wav`,
    [
      ...rim(0, 0.6, { f: f * (1 + spread(i, 4) * 0.03), offset: 0.4 + i * 0.11 }),
      ...hat(0, 0.1, { d: 0.015, offset: 1.1 + i * 0.07 }),
    ],
  ]))),
  'menu-sheet.wav': [...stamp(0, 0.6), ...snap(0.002, 0.35, { f: 2100, offset: 0.7 })],
  // Rhodes's Fenêtre chord (Amaj7: A, C#, E, G#), rolled over 18 ms, with the
  // stamp under it — the sheet's own arpeggio, borrowed for Start.
  'menu-start.wav': [
    ...['A5', 'C#6', 'E6', 'G#6'].flatMap((note, k) => rhodes(k * 0.006, hz(note), { g: 0.15, decay: 0.55, index: 1.1 })),
    ...stamp(0, 0.22),
  ],
  // The brush back down: the bolt's, reversed.
  ...Object.fromEntries([0, 1].map(i => [
    `menu-cancel-${i + 1}.wav`,
    sweep(0, 0.7, { from: 2800 * (1 + spread(i, 2) * 0.08), to: 750, time: 0.13, offset: 0.3 + i * 0.13 }),
  ])),
};

// ---------- Rendering ----------

function envelope(v, time) {
  const end = v.a + v.d;
  if (time < 0 || time >= end)
    return 0;
  if (time < v.a)
    return v.g * time / v.a;
  return v.g * (FLOOR / v.g) ** ((time - v.a) / v.d);
}

// Seeded white noise, the same sequence the bench used, starting `skip`
// samples in so that variants don't share one texture.
function noise(length, skip = 0) {
  const out = new Float64Array(length);
  let seed = 12345;
  for (let i = 0; i < skip + length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    if (i >= skip)
      out[i - skip] = seed / 2147483648 - 1;
  }
  return out;
}

// An oscillator, as Web Audio plays it: its frequency glides exponentially
// to `to` over `time`, then holds; detune shifts it all; FM adds a sine at
// ratio × f whose depth (index × its frequency) falls exponentially to 2 %
// over fm.decay. A sawtooth is summed from its harmonics, band-limited.
function oscillator(v, count) {
  const shift = cents(v.detune ?? 0);
  const from = v.f * shift;
  const to = (v.glide?.to ?? v.f) * shift;
  const harmonics = v.wave === 'sawtooth' ? Math.max(1, Math.floor(SAW_TOP_HZ / Math.max(from, to))) : 1;
  const modHz = v.fm ? v.f * v.fm.ratio : 0;
  const out = new Float64Array(count);
  let phase = 0;
  for (let i = 0; i < count; i++) {
    const time = i / SAMPLE_RATE;
    let f = v.glide ? from * (to / from) ** (Math.min(time, v.glide.time) / v.glide.time) : from;
    if (v.fm)
      f += modHz * v.fm.index * 0.02 ** (Math.min(time, v.fm.decay) / v.fm.decay) * Math.sin(2 * Math.PI * modHz * time);
    phase += 2 * Math.PI * f / SAMPLE_RATE;
    if (harmonics === 1) {
      out[i] = Math.sin(phase);
      continue;
    }
    let sum = 0;
    for (let k = 1; k <= harmonics; k++)
      sum += (k % 2 ? 1 : -1) * Math.sin(k * phase) / k;
    out[i] = sum * 2 / Math.PI;
  }
  return out;
}

// Web Audio's BiquadFilterNode coefficients (RBJ cookbook). Its Q is linear
// for a band-pass, with a 0 dB peak, but in dB for a high-pass or low-pass.
const FILTERS = {
  bandpass: (w0, q) => {
    const alpha = Math.sin(w0) / (2 * q);
    return { alpha, b: [alpha, 0, -alpha] };
  },
  highpass: (w0, q) => {
    const alpha = Math.sin(w0) / (2 * 10 ** (q / 20));
    const cos = Math.cos(w0);
    return { alpha, b: [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2] };
  },
  lowpass: (w0, q) => {
    const alpha = Math.sin(w0) / (2 * 10 ** (q / 20));
    const cos = Math.cos(w0);
    return { alpha, b: [(1 - cos) / 2, 1 - cos, (1 - cos) / 2] };
  },
};

function coefficients(type, f, q) {
  const w0 = 2 * Math.PI * f / SAMPLE_RATE;
  const { alpha, b } = FILTERS[type](w0, q);
  const a0 = 1 + alpha;
  return { b: b.map(value => value / a0), a: [-2 * Math.cos(w0) / a0, (1 - alpha) / a0] };
}

// Given `to`, the frequency sweeps there exponentially over `time`, then
// holds, as Web Audio's exponentialRampToValueAtTime does.
function filter(input, { type, f, q, to, time }) {
  const quality = q ?? (type === 'bandpass' ? 1 : 0.7);
  const fixed = coefficients(type, f, quality);
  const out = new Float64Array(input.length);
  let [x1, x2, y1, y2] = [0, 0, 0, 0];
  for (let i = 0; i < input.length; i++) {
    const { b: [b0, b1, b2], a: [a1, a2] } = to
      ? coefficients(type, f * (to / f) ** (Math.min(i / SAMPLE_RATE, time) / time), quality)
      : fixed;
    const y = b0 * input[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    [x2, x1, y2, y1] = [x1, input[i], y1, y];
    out[i] = y;
  }
  return out;
}

function render(allVoices) {
  const voices = allVoices.filter(v => v.noise || v.f <= MAX_HZ);
  const length = Math.ceil(Math.max(...voices.map(v => v.t + v.a + v.d)) * SAMPLE_RATE) + 1;
  const mix = new Float64Array(length);
  for (const v of voices) {
    const startIndex = Math.round(v.t * SAMPLE_RATE);
    const count = Math.ceil((v.a + v.d) * SAMPLE_RATE);
    const raw = v.noise ? noise(count, Math.round((v.noise.offset ?? 0) * SAMPLE_RATE)) : oscillator(v, count);
    const spec = v.noise ?? v.filter;
    const source = spec ? filter(raw, spec) : raw;
    for (let i = 0; i < count && startIndex + i < length; i++)
      mix[startIndex + i] += source[i] * envelope(v, i / SAMPLE_RATE);
  }
  return mix;
}

function toWav(samples, gain) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * gain)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// ---------- Levels ----------

const peakOf = samples => samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
const toDb = value => (20 * Math.log10(value)).toFixed(2);
const target = 10 ** (PEAK_DB / 20);
function mixOf(a, b) {
  const out = new Float64Array(Math.max(a.length, b.length));
  a.forEach((s, i) => (out[i] += s));
  b.forEach((s, i) => (out[i] += s));
  return out;
}

// Cadence, leveled on the first round's chord, with the snap on its
// arrival, lighter than the chord's.
const norm = peakOf(render(FIRST_CHORD)) / peakOf(render(cadence(0)));
function correctVoices(i) {
  return [
    ...cadence(i).map(v => ({ ...v, g: v.g * norm })),
    ...snap(ARRIVAL, 0.3, { f: 2000 + (i % 4) * 110, offset: 0.3 + i * 0.07 }),
  ];
}
const voicesOf = spec => (Array.isArray(spec) ? spec : correctVoices(spec.correct));
const rendered = new Map(Object.entries(SOUNDS).map(([file, spec]) => [file, render(voicesOf(spec))]));

// The correct answer sets the level for all, as on the bench: the loudest
// of its variants peaks at CORRECT_DB, a little under PEAK_DB. In a streak a
// layer plays on top of it and needs that room to be heard without
// clipping.
const CORRECT_DB = -3;
const files = [...rendered.keys()];
const correctFiles = files.filter(file => file.startsWith('jazz-correct-'));
const layerFiles = files.filter(file => file.startsWith('jazz-streak-'));
const sharedGain = 10 ** (CORRECT_DB / 20) / Math.max(...correctFiles.map(file => peakOf(rendered.get(file))));
// Every other sound keeps its balance to the correct answer, unless it
// would peak over PEAK_DB: then it's held there, about what the bench's
// compressor did to the fullest ones (the go, the results).
const gains = new Map(files.map((file) => {
  const ceiling = target / peakOf(rendered.get(file));
  if (ceiling < sharedGain)
    console.warn(`${file}: held at ${PEAK_DB} dB peak, ${toDb(sharedGain / ceiling)} dB under its balance`);
  return [file, Math.min(sharedGain, ceiling)];
}));
// A streak's layer plays over the correct answer, two files at once. Where
// the two would go over PEAK_DB, the layer is turned down, only there: as
// the bench's compressor did, it ducks just ahead (ATTACK) and lets go over
// RELEASE. Checked against every correct answer, with the layer starting up
// to JITTER early or late: two players never start on the same sample.
const JITTER = 0.005;
const ATTACK = 0.002;
const RELEASE = 0.08;
function duck(layer, corrects) {
  const allowed = new Float64Array(layer.length).fill(1);
  const reach = Math.round(JITTER * SAMPLE_RATE);
  const step = Math.round(0.001 * SAMPLE_RATE);
  for (const correct of corrects) {
    for (let shift = -reach; shift <= reach; shift += step) {
      for (let i = 0; i < layer.length; i++) {
        const c = correct[i + shift] ?? 0;
        const sum = c + layer[i];
        // The largest gain that keeps c + gain × layer within PEAK_DB: the
        // sum leaves through the side it's heading to.
        if (Math.abs(sum) > target)
          allowed[i] = Math.min(allowed[i], ((sum > 0 ? target : -target) - c) / layer[i]);
      }
    }
  }
  const release = 1 - Math.exp(-1 / (RELEASE * SAMPLE_RATE));
  const attack = 1 - Math.exp(-1 / (ATTACK * SAMPLE_RATE));
  const gain = Float64Array.from(allowed, g => Math.max(0, g));
  for (let i = 1; i < gain.length; i++)
    gain[i] = Math.min(gain[i], gain[i - 1] + (1 - gain[i - 1]) * release);
  for (let i = gain.length - 2; i >= 0; i--)
    gain[i] = Math.min(gain[i], gain[i + 1] + (1 - gain[i + 1]) * attack);
  return layer.map((s, i) => s * gain[i]);
}
const scaled = (samples, gain) => samples.map(s => s * gain);
const rms = samples => Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
const correctsAtLevel = correctFiles.map(file => scaled(rendered.get(file), sharedGain));
for (const file of layerFiles) {
  const layer = scaled(rendered.get(file), gains.get(file));
  const ducked = duck(layer, correctsAtLevel);
  rendered.set(file, ducked);
  gains.set(file, 1);
  const worst = Math.max(...correctsAtLevel.map(correct => peakOf(mixOf(correct, ducked))));
  console.log(`${file}: ducked under the correct answer, ${toDb(rms(ducked) / rms(layer))} dB overall; with it, peaks at ${toDb(worst)} dB`);
}

// What a phone speaker leaves of a sound, roughly: the loudness of its
// loudest 30 ms through two high-passes at PHONE_HZ. A sound whose peak is
// fine but whose phone level is far under the others' won't be heard on a
// phone.
const PHONE_HZ = 700;
const BUTTERWORTH_Q_DB = -3.01;
function phoneLevel(samples) {
  const speaker = { type: 'highpass', f: PHONE_HZ, q: BUTTERWORTH_Q_DB };
  const heard = filter(filter(samples, speaker), speaker);
  const size = Math.min(heard.length, Math.round(SAMPLE_RATE * 0.03));
  const hop = Math.round(SAMPLE_RATE * 0.005);
  let loudest = 0;
  for (let start = 0; start + size <= heard.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + size; i++)
      sum += heard[i] * heard[i];
    loudest = Math.max(loudest, sum / size);
  }
  return Math.sqrt(loudest);
}

const referenceLevel = phoneLevel(rendered.get(REFERENCE)) * gains.get(REFERENCE);
for (const [file, db] of Object.entries(KEY_LEVELS)) {
  const samples = rendered.get(file);
  const gain = referenceLevel * 10 ** (db / 20) / phoneLevel(samples);
  const ceiling = target / peakOf(samples);
  if (gain > ceiling)
    console.warn(`${file}: held at ${PEAK_DB} dB peak, ${toDb(gain / ceiling)} dB short of its level`);
  gains.set(file, Math.min(gain, ceiling));
}
function write(target, samples, gain) {
  writeFileSync(target, toWav(samples, gain));
  const ms = Math.round(samples.length / SAMPLE_RATE * 1000);
  const phone = phoneLevel(samples) * gain;
  console.log(`${path.basename(target)}: ${ms} ms, peak ${toDb(peakOf(samples) * gain)} dB, on a phone ${toDb(phone)} dB (${toDb(phone / referenceLevel)} dB to the correct answer)`);
}
for (const [file, samples] of rendered)
  write(path.join(OUT_DIR, file), samples, gains.get(file));

// ---------- The home menu's levels ----------

// As on its bench: each moment's first file peaks MENU_LEVELS dB under
// Start, its other variants keep their balance to it, and Start peaks
// MENU_DB under the countdown's 3, the first sound of the challenge it
// starts.
const MENU_OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/features/home/sounds');
const MENU_DB = -6;
const MENU_LEVELS = { 'menu-entry': -3, 'menu-card': -9, 'menu-sheet': -5, 'menu-start': 0, 'menu-cancel': -8 };
const countPeak = peakOf(rendered.get('jazz-countdown-3.wav')) * gains.get('jazz-countdown-3.wav');
mkdirSync(MENU_OUT_DIR, { recursive: true });
const menuFiles = Object.keys(MENU_SOUNDS);
for (const [moment, db] of Object.entries(MENU_LEVELS)) {
  const files = menuFiles.filter(file => file === `${moment}.wav` || file.startsWith(`${moment}-`));
  const samples = files.map(file => render(MENU_SOUNDS[file]));
  const gain = countPeak * 10 ** ((MENU_DB + db) / 20) / peakOf(samples[0]);
  files.forEach((file, k) => write(path.join(MENU_OUT_DIR, file), samples[k], gain));
}
