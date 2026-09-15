function pad(value: number) {
  return String(value).padStart(2, '0');
}

// mm:ss.cc, the timer's readout and the results' time.
export function formatElapsed(ms: number) {
  const centiseconds = Math.floor(ms / 10) % 100;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000);
  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}
