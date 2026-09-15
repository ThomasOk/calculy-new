import type { EntranceStyle } from '@/features/challenge/prototype-not-boring/pagaille-style';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Text } from '@/components/ui';
import { digitRise, GOTHIC, ON_SPLASH } from '@/features/challenge/prototype-not-boring/pagaille-style';
import { SKINS } from '@/features/challenge/prototype-not-boring/skins';

// A challenge's count in a white box, as the home title's cut-out first
// letter, leaning and poking out above what it sits on; inverted, black, on
// a lit plate. Shared by the menu's items (challenge-card.tsx) and the
// challenge's sheet (challenge-intro-sheet.tsx).

const SKIN = SKINS.white;
const LEAN = '3deg';
// How far it pokes out above, in its digits' size.
const RISE = 0.125;

type Props = {
  count: number;
  // The digits' size, in points.
  size: number;
  inverted?: boolean;
  // Built once by the caller: a new keyframes object on a re-render could
  // replay the entrance.
  entrance?: EntranceStyle;
};

export function CountBox({ count, size, inverted = false, entrance }: Props) {
  // Its lean on the outside, so the entrance's scale doesn't replace it.
  return (
    <View style={{ transform: [{ translateY: -size * RISE }, { rotate: LEAN }] }}>
      <Animated.View style={[styles.box, { backgroundColor: inverted ? '#000000' : SKIN.ink }, entrance]}>
        <Text
          style={[
            GOTHIC,
            styles.count,
            { fontSize: size, lineHeight: size, marginBottom: digitRise(size), color: inverted ? SKIN.ink : ON_SPLASH },
          ]}
        >
          {count}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingTop: 3,
    paddingHorizontal: 9,
  },
  count: {
    includeFontPadding: false,
  },
});
