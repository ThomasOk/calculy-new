import type { StyleProp, ViewStyle } from 'react-native';
import type { EntranceStyle } from '@/features/challenge/prototype-not-boring/pagaille-style';
import type { Skin } from '@/features/challenge/prototype-not-boring/skins';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Text } from '@/components/ui';
import { menuTapHaptic } from '@/features/challenge/haptics';
import {
  fadeIn,
  GOTHIC,
  ON_SPLASH,
  PRESS_DEPTH,
  PRESS_TRANSITION,
  SKEW,
  stampIn,
} from '@/features/challenge/prototype-not-boring/pagaille-style';

// PROTOTYPE — Not Boring direction. Throwaway: see challenge-screen.tsx.
//
// Pagaille's menu pieces, as Persona's menus, shared by its results
// (pagaille-results.tsx) and the home screen:
// - Titles on slanted black plates, as the prompts of Persona 5's battles:
//   the first letter cut out of paper, the second boxed in a white line,
//   both stamped down one after the other.
// - Menu items on slanted plates: black at rest; lit, white over their
//   accent shadow, as Persona's cursor.
//   Pressed, a plate goes down into its shadow.
// Words are React Native text, not Skia, so any script falls back to a
// system font. Only Latin titles get their cut letters: cutting joined
// letters would break them.

// Latin, cut letter by letter: up to the end of Latin Extended-B.
const LAST_CUTTABLE = 0x024F;
// A title's second cut letter is stamped this long after its first.
const CUT_STAGGER_MS = 35;
// A title that can't be cut, in a system font, smaller and with room for
// its script's ascenders and descenders.
const UNCUT_SIZE = 0.75;
const UNCUT_LINE = 1.3;
// The shadow sits this far under a plate.
const SHADOW_OFFSET = 6;

type Entrance = 'stamp' | 'fade' | 'none';

// Built once per delay: a new keyframes object on a re-render could replay
// the entrance.
const cutEntrances = new Map<string, EntranceStyle>();
function cutEntrance(entrance: Entrance, at: number) {
  if (entrance === 'none')
    return undefined;
  const key = `${entrance}:${at}`;
  let appear = cutEntrances.get(key);
  if (!appear) {
    appear = entrance === 'stamp' ? stampIn(at) : fadeIn(at);
    cutEntrances.set(key, appear);
  }
  return appear;
}

// A black plate, slanted as the menus' items; its content, with the
// padding in `style`, sets its size.
export function Plate({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <View style={style}>
      <View style={styles.plateInk} />
      {children}
    </View>
  );
}

type PlateTitleProps = {
  text: string;
  skin: Skin;
  // The letters' size, in points.
  size: number;
  // The cut-out first letter's paper: white, or the accent for a win.
  paper?: 'ink' | 'accent';
  // The cut letters stamped down from `cutsAt` ms after the mount, faded in
  // (reduced motion), or already there.
  entrance: Entrance;
  cutsAt?: number;
  // The plate's padding.
  style?: StyleProp<ViewStyle>;
};

export function PlateTitle({ text, skin, size, paper = 'ink', entrance, cutsAt = 0, style }: PlateTitleProps) {
  const cuttable = Array.from(text).every(char => (char.codePointAt(0) ?? 0) <= LAST_CUTTABLE);
  const [first = '', second = '', ...rest] = Array.from(text.toUpperCase());
  const letters = [GOTHIC, styles.letters, { fontSize: size, lineHeight: size }];
  return (
    <Plate style={style}>
      <View style={styles.title} accessible accessibilityRole="header" accessibilityLabel={text}>
        {cuttable
          ? (
              <>
                <Animated.View
                  style={[styles.paper, { backgroundColor: paper === 'accent' ? skin.accent : skin.ink }, cutEntrance(entrance, cutsAt)]}
                >
                  <Text style={[letters, { color: ON_SPLASH }]}>{first}</Text>
                </Animated.View>
                {/* Its lean on the outside, so the stamp's scale doesn't replace it. */}
                <View style={styles.boxedPlace}>
                  <Animated.View style={[styles.boxed, { borderColor: skin.ink }, cutEntrance(entrance, cutsAt + CUT_STAGGER_MS)]}>
                    <Text style={[letters, { color: skin.ink }]}>{second}</Text>
                  </Animated.View>
                </View>
                <Text style={[letters, { color: skin.ink }]}>{rest.join('')}</Text>
              </>
            )
          : (
              <Text style={[styles.letters, { fontSize: size * UNCUT_SIZE, lineHeight: size * UNCUT_SIZE * UNCUT_LINE, color: skin.ink }]}>
                {text}
              </Text>
            )}
      </View>
    </Plate>
  );
}

type MenuPlateProps = {
  // The selected item: white over its accent shadow. Otherwise black.
  lit: boolean;
  pressed: boolean;
  skin: Skin;
  reducedMotion: boolean;
  // The content's box, which sizes the plate: its padding and layout.
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// Pressed, the plate and its content go down into the shadow, as the finger
// lands. Reduced motion dims the plate instead.
export function MenuPlate({ lit, pressed, skin, reducedMotion, style, children }: MenuPlateProps) {
  const sink = pressed && !reducedMotion;
  const dim = pressed && reducedMotion;
  return (
    <View>
      {lit && <View style={[styles.shadow, { backgroundColor: skin.accent }]} />}
      <Animated.View
        style={[
          styles.plate,
          { backgroundColor: lit ? skin.ink : '#000000' },
          PRESS_TRANSITION,
          sink && styles.platePressed,
          dim && styles.dimmed,
        ]}
      />
      <Animated.View style={[style, styles.contentRest, PRESS_TRANSITION, sink && styles.contentPressed]}>
        {children}
      </Animated.View>
    </View>
  );
}

type MenuButtonProps = {
  label: string;
  // The one to pick: lit, as the selected menu item.
  primary: boolean;
  // In degrees.
  lean: number;
  skin: Skin;
  onPress: () => void;
  reducedMotion: boolean;
};

export function MenuButton({ label, primary, lean, skin, onPress, reducedMotion }: MenuButtonProps) {
  const [pressed, setPressed] = React.useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        menuTapHaptic();
      }}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ transform: [{ rotate: `${lean}deg` }] }}
    >
      <MenuPlate lit={primary} pressed={pressed} skin={skin} reducedMotion={reducedMotion} style={styles.button}>
        <Text style={[GOTHIC, styles.buttonLabel, { color: primary ? ON_SPLASH : skin.ink }]}>
          {label.toUpperCase()}
        </Text>
      </MenuPlate>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plateInk: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    transform: [{ skewX: SKEW }],
  },
  title: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    // The cut letters lead: the same way round in every language.
    direction: 'ltr',
  },
  letters: {
    includeFontPadding: false,
  },
  paper: {
    marginRight: 5,
    paddingHorizontal: 6,
  },
  boxedPlace: {
    marginRight: 5,
    transform: [{ translateY: -4 }, { rotate: '3deg' }],
  },
  boxed: {
    paddingHorizontal: 4,
    borderWidth: 3,
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: SHADOW_OFFSET }, { translateY: SHADOW_OFFSET }, { skewX: SKEW }],
  },
  plate: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 0 }, { translateY: 0 }, { skewX: SKEW }],
  },
  platePressed: {
    transform: [{ translateX: PRESS_DEPTH }, { translateY: PRESS_DEPTH }, { skewX: SKEW }],
  },
  contentRest: {
    transform: [{ translateX: 0 }, { translateY: 0 }],
  },
  contentPressed: {
    transform: [{ translateX: PRESS_DEPTH }, { translateY: PRESS_DEPTH }],
  },
  dimmed: {
    opacity: 0.8,
  },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonLabel: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 1,
  },
});
