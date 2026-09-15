import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Challenge } from '@/features/challenge/challenges';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar, View } from '@/components/ui';
import { CHALLENGES } from '@/features/challenge/challenges';
import { usePagailleFonts } from '@/features/challenge/prototype-not-boring/pagaille-style';
import { SKINS } from '@/features/challenge/prototype-not-boring/skins';
import { ChallengeCard } from '@/features/home/components/challenge-card';
import { ChallengeIntroSheet } from '@/features/home/components/challenge-intro-sheet';
import { HomeTitle } from '@/features/home/components/home-title';
import { useMenuSounds } from '@/features/home/use-menu-sounds';

// Persona's main menu in Pagaille's look, the challenge it leads to: the
// name and the heading on black plates across a bolt of paint
// (home-title.tsx), giant operators faint behind, and the challenges as the
// menu's items right below (challenge-card.tsx). Dark in both themes, like
// the challenge. Each gesture has its sound (use-menu-sounds.ts), and the
// title's entrance too.

const SKIN = SKINS.white;
// The background's operators: their size and thickness, in points, and
// their color, barely off the background. Opaque, so the crossing bars
// don't add up.
const OPERATOR_SIZE = 220;
const OPERATOR_BAR = 48;
const OPERATOR_COLOR = '#212121';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fontsLoaded = usePagailleFonts();
  const sounds = useMenuSounds();
  const sheet = React.useRef<BottomSheetModal>(null);
  // Not cleared on dismiss, so the sheet keeps its content while it slides
  // away.
  const [selected, setSelected] = React.useState<Challenge | null>(null);
  // The item whose sheet is up, lit until the sheet is gone.
  const [lit, setLit] = React.useState<string | null>(null);
  // Set from Start until the sheet is gone, so a double tap starts one
  // challenge, not two, and the sheet going away isn't heard as a cancel.
  const isLeaving = React.useRef(false);

  // The title comes in once, as it mounts with the fonts (the tab stays
  // mounted): its sound with it.
  React.useEffect(() => {
    if (fontsLoaded)
      sounds.playEntry();
  }, [fontsLoaded, sounds]);

  const select = (challenge: Challenge) => {
    setSelected(challenge);
    setLit(challenge.id);
    sheet.current?.present();
  };

  const start = () => {
    if (!selected || isLeaving.current)
      return;
    isLeaving.current = true;
    sounds.playStart();
    // Together rather than one after the other: the sheet slides away while
    // the challenge pushes in beneath it, instead of delaying the countdown
    // by its exit. Pagaille (M) is the challenge screen's default variant.
    sheet.current?.dismiss();
    router.push({ pathname: '/challenge/[id]', params: { id: selected.id } });
  };

  if (!fontsLoaded)
    return <View style={styles.screen} />;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <FocusAwareStatusBar style="light" />
      <Operators />
      <HomeTitle />
      <View style={styles.menu}>
        {CHALLENGES.map((challenge, step) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            step={step}
            lit={lit === challenge.id}
            onPressIn={() => sounds.playCard(step)}
            onPress={() => select(challenge)}
          />
        ))}
      </View>
      <ChallengeIntroSheet
        ref={sheet}
        challenge={selected}
        onStart={start}
        onCancel={() => sheet.current?.dismiss()}
        onStamped={sounds.playSheet}
        onClosing={() => {
          if (!isLeaving.current)
            sounds.playCancel();
        }}
        onDismiss={() => {
          isLeaving.current = false;
          setLit(null);
        }}
      />
    </View>
  );
}

// Giant operators faint in the background, as the big shapes behind
// Persona's menus. Decoration only: hidden from screen readers.
function Operators() {
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Cross style={styles.times} />
      <Cross style={styles.plus} />
    </View>
  );
}

// A plus of two flat bars: turned, a times.
function Cross({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.cross, style]}>
      <View style={[styles.bar, styles.across]} />
      <View style={[styles.bar, styles.down]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: SKIN.background,
  },
  cross: {
    position: 'absolute',
    width: OPERATOR_SIZE,
    height: OPERATOR_SIZE,
  },
  bar: {
    position: 'absolute',
    backgroundColor: OPERATOR_COLOR,
  },
  across: {
    left: 0,
    right: 0,
    top: (OPERATOR_SIZE - OPERATOR_BAR) / 2,
    height: OPERATOR_BAR,
  },
  down: {
    top: 0,
    bottom: 0,
    left: (OPERATOR_SIZE - OPERATOR_BAR) / 2,
    width: OPERATOR_BAR,
  },
  times: {
    top: '32%',
    right: -40,
    transform: [{ rotate: '40deg' }],
  },
  plus: {
    top: '47%',
    left: -70,
    transform: [{ rotate: '-8deg' }],
  },
  // Full width: each item bleeds off the left edge on its own.
  menu: {
    marginTop: 14,
    gap: 10,
  },
});
