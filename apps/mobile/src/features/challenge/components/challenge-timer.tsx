import * as React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { GLOSS_INK } from '@/features/challenge/components/gloss-styles';
import { formatElapsed } from '@/features/challenge/format-elapsed';
import { DIGITS_FONT } from '@/features/challenge/typography';

// ~30 ticks per second is enough for a centisecond readout. The time is
// computed from timestamps, so a late tick never makes the clock drift.
const TICK_MS = 33;

type Props = {
  startedAt: number | null;
  finishedAt: number | null;
};

// Owns its ticking state so only this text re-renders, not the whole board.
export function ChallengeTimer({ startedAt, finishedAt }: Props) {
  const [now, setNow] = React.useState(() => Date.now());
  const isRunning = startedAt !== null && finishedAt === null;

  React.useEffect(() => {
    if (!isRunning)
      return;
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [isRunning]);

  const elapsed = startedAt === null ? 0 : Math.max(0, (finishedAt ?? now) - startedAt);

  return (
    <Text className="py-4 text-center text-3xl" style={[DIGITS_FONT, styles.digits]}>
      {formatElapsed(elapsed)}
    </Text>
  );
}

const styles = StyleSheet.create({
  digits: {
    fontVariant: ['tabular-nums'],
    color: GLOSS_INK,
  },
});
