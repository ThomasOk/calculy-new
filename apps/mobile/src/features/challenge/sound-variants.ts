// A repeated sound comes in variants (scripts/generate-challenge-sounds.mjs):
// the next one is drawn at random, never the one just played, so that a
// sound heard 20 to 30 times a run never repeats itself back to back.
// last: the variant just played, or null for the first one.
export function nextVariant(count: number, last: number | null, random: () => number = Math.random) {
  if (count <= 1)
    return 0;
  if (last === null)
    return Math.floor(random() * count);
  // Drawn among the others: the ones from `last` up shift by one.
  const drawn = Math.floor(random() * (count - 1));
  return drawn >= last ? drawn + 1 : drawn;
}
