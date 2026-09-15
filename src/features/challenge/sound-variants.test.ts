import { nextVariant } from '@/features/challenge/sound-variants';

// A random source returning these values in turn.
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('nextVariant', () => {
  it('draws any variant for the first sound', () => {
    expect(nextVariant(8, null, sequence(0))).toBe(0);
    expect(nextVariant(8, null, sequence(0.99))).toBe(7);
  });

  it('never plays the variant just played', () => {
    expect(nextVariant(8, 3, sequence(3 / 7))).toBe(4);
    expect(nextVariant(8, 7, sequence(0.99))).toBe(6);
    expect(nextVariant(8, 0, sequence(0))).toBe(1);
  });

  it('can draw every other variant', () => {
    const drawn = new Set(Array.from({ length: 7 }, (_, k) => nextVariant(8, 2, sequence(k / 7))));
    expect([...drawn].sort()).toEqual([0, 1, 3, 4, 5, 6, 7]);
  });

  it('always plays the only variant of a single sound', () => {
    expect(nextVariant(1, 0, sequence(0.5))).toBe(0);
  });
});
