import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StageLayout } from '@/features/challenge/prototype-not-boring/not-boring-challenge';
import { Redirect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar, View } from '@/components/ui';
import { findChallenge } from '@/features/challenge/challenges';
import { ChallengeBoard } from '@/features/challenge/components/challenge-board';
import { GLOSS_BACKGROUND } from '@/features/challenge/components/gloss-styles';
import { NotBoringChallenge } from '@/features/challenge/prototype-not-boring/not-boring-challenge';

// PROTOTYPE: thirteen looks for the challenge. M, Pagaille, is the one the
// app opens; the others stay reachable from a link, for comparison:
// calculy://challenge/calculy-20?variant=A. A is the previous Aqua board;
// B and C are the Not Boring direction with its white and chrome skins and one
// giant number; D is Not Boring white with the previous, current and next
// calculations as a roll; E has those three as a band above the giant answer.
// F and G are B with the next calculation in view, to read ahead: F piles the
// calculations to come behind the current one, G lines them up left to right.
// H is A's cards made Not Boring: the calculations on lacquered slabs in
// relief, lit by the tilt. I is G with the line bent into a dome: the
// calculations stand on the rim of a wheel that turns one notch per answer.
// J is D tidied up, with game feel: three calculations at most, the current
// one big, scrolling up; digits stamped in, each answer a hit. K is J with
// I's giant answer: a card holds the current calculation above it, and the
// answer flies up into the column when confirmed. L is G's flat line with
// the current calculation in relief, the others flat and gray. M stacks the
// calculations in a mess, as a Persona menu: each leaning its own way, the
// current one in black on a splash of paint, its answer typed in place.
// Same game in all thirteen.
const VARIANTS = [
  { key: 'A', name: 'Aqua (actuel)' },
  { key: 'B', name: 'Not Boring · Blanc' },
  { key: 'C', name: 'Not Boring · Chrome' },
  { key: 'D', name: 'Not Boring · Rouleau' },
  { key: 'E', name: 'Not Boring · Bande' },
  { key: 'F', name: 'Not Boring · Pile' },
  { key: 'G', name: 'Not Boring · Ligne' },
  { key: 'H', name: 'Not Boring · Cartes' },
  { key: 'I', name: 'Not Boring · Arc' },
  { key: 'J', name: 'Not Boring · Défilé' },
  { key: 'K', name: 'Not Boring · Colonne' },
  { key: 'L', name: 'Not Boring · Vedette' },
  { key: 'M', name: 'Not Boring · Pagaille' },
] as const;
type VariantKey = (typeof VARIANTS)[number]['key'];

const LAYOUTS: Record<Exclude<VariantKey, 'A'>, StageLayout> = {
  B: 'number',
  C: 'number',
  D: 'roll',
  E: 'band',
  F: 'pile',
  G: 'line',
  H: 'cards',
  I: 'arc',
  J: 'reel',
  K: 'stack',
  L: 'spotlight',
  M: 'pagaille',
};

function parseVariant(value: string | undefined): VariantKey {
  return VARIANTS.find(variant => variant.key === value)?.key ?? 'M';
}

export function ChallengeScreen() {
  const { id, variant: variantParam } = useLocalSearchParams<{ id: string; variant?: string }>();
  const variant = parseVariant(variantParam);
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

  if (variant === 'A') {
    // Light in both themes: the glossy keys and cards are drawn for a light
    // background.
    return (
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <FocusAwareStatusBar style="dark" />
        <ChallengeBoard
          problemCount={challenge.problemCount}
          onQuit={quit}
          ready={hasEntered}
        />
      </View>
    );
  }

  return (
    <NotBoringChallenge
      key={variant}
      skinName={variant === 'C' ? 'chrome' : 'white'}
      layout={LAYOUTS[variant]}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    experimental_backgroundImage: GLOSS_BACKGROUND,
  },
});
