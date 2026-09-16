import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Redirect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findChallenge } from '@/features/challenge/challenges';
import { NotBoringChallenge } from '@/features/challenge/prototype-not-boring/not-boring-challenge';

// The challenge, as a dark calculator with the calculations stacked in a
// mess down the stage, as a Persona menu (not-boring-challenge.tsx,
// problem-pagaille.tsx). This was picked from thirteen looks tried side by
// side — see git history for the others, and docs/handoffs for how.
export function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = findChallenge(id);
  const insets = useSafeAreaInsets();
  const hasEntered = useHasEntered();
  const router = useRouter();

  if (!challenge)
    return <Redirect href="/" />;

  // Opened from a link there is no home screen underneath to go back to.
  const quit = () => {
    if (router.canGoBack())
      router.back();
    else
      router.replace('/');
  };

  return (
    <NotBoringChallenge
      problemCount={challenge.problemCount}
      onQuit={quit}
      streakMilestones={challenge.streakMilestones}
      ready={hasEntered}
      insets={{ top: insets.top, bottom: insets.bottom }}
    />
  );
}

// True once the push transition has finished, so the countdown's 3 isn't spent
// sliding in with the screen.
function useHasEntered() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [hasEntered, setHasEntered] = React.useState(false);
  React.useEffect(
    () =>
      navigation.addListener('transitionEnd', (event) => {
        if (!event.data.closing)
          setHasEntered(true);
      }),
    [navigation],
  );
  return hasEntered;
}
