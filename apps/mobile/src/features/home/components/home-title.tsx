import * as React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Polygon, Svg } from 'react-native-svg';
import { Text } from '@/components/ui';
import { PRODUCT_NAME } from '@/features/challenge/challenges';
import { Plate, PlateTitle } from '@/features/challenge/prototype-not-boring/pagaille-menu';
import { fadeIn, GOTHIC, slideIn } from '@/features/challenge/prototype-not-boring/pagaille-style';
import { SKINS } from '@/features/challenge/prototype-not-boring/skins';
import { translate } from '@/lib/i18n';

// The home screen's title, as the prompts of Persona 5's battles: the name
// on a black plate, its first letter cut out of white paper and its second
// boxed in a white line (PlateTitle, pagaille-menu.tsx), the heading on a
// smaller plate under it, both across a bolt of accent paint.
// Once per launch (the tab stays mounted): the bolt strikes across, the
// plates slide in from either side, then the two cut letters are stamped
// down. Reduced motion: all of it fades in, in the same order.

const SKIN = SKINS.white;
const HEIGHT = 224;
const PLATE_LEAN = '-7deg';
const NAME_SIZE = 92;
const HEADING_SIZE = 28;
// The bolt and a spike pointing into it, drawn in a 390 × 262 box and
// stretched to the title's size.
const BOLT_BOX = '0 0 390 262';
const BOLT = '-14,226 118,168 102,154 252,96 236,82 404,8 404,58 290,106 306,120 158,184 176,198 -14,262';
const SPIKE = '18,8 236,98 229,106';
// The entrances, in ms from the mount, and how far each part comes from.
const BOLT_FROM = -420;
const PLATE_FROM = 110;
const NAME_AT = 60;
const HEADING_AT = 170;
const CUTS_AT = 230;

// Built once: a new keyframes object on a re-render could replay the entrance.
const BOLT_IN = slideIn(0, BOLT_FROM);
const NAME_IN = slideIn(NAME_AT, -PLATE_FROM);
const HEADING_IN = slideIn(HEADING_AT, PLATE_FROM);
const BOLT_IN_STILL = fadeIn(0);
const NAME_IN_STILL = fadeIn(NAME_AT);
const HEADING_IN_STILL = fadeIn(HEADING_AT);

export function HomeTitle() {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  return (
    <View style={styles.title}>
      <Animated.View
        pointerEvents="none"
        style={[styles.bolt, reducedMotion ? BOLT_IN_STILL : BOLT_IN]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={width} height={HEIGHT} viewBox={BOLT_BOX} preserveAspectRatio="none">
          <Polygon points={BOLT} fill={SKIN.accent} />
          <Polygon points={SPIKE} fill={SKIN.accent} />
        </Svg>
      </Animated.View>
      <View style={[styles.place, styles.namePlace]}>
        <Animated.View style={reducedMotion ? NAME_IN_STILL : NAME_IN}>
          <PlateTitle
            text={PRODUCT_NAME}
            skin={SKIN}
            size={NAME_SIZE}
            entrance={reducedMotion ? 'fade' : 'stamp'}
            cutsAt={CUTS_AT}
            style={styles.namePlate}
          />
        </Animated.View>
      </View>
      <View style={[styles.place, styles.headingPlace]}>
        <Animated.View style={reducedMotion ? HEADING_IN_STILL : HEADING_IN}>
          <Plate style={styles.headingPlate}>
            <Text style={[GOTHIC, styles.heading]} accessibilityRole="header">
              {translate('home.title').toUpperCase()}
            </Text>
          </Plate>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    height: HEIGHT,
    // A logo: the same way round in every language.
    direction: 'ltr',
  },
  bolt: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  // Leaning from their left end, which is off the screen for the name.
  place: {
    position: 'absolute',
    transformOrigin: 'left center',
    transform: [{ rotate: PLATE_LEAN }],
  },
  namePlace: {
    left: -26,
    top: 28,
  },
  headingPlace: {
    left: 62,
    top: 150,
  },
  namePlate: {
    paddingTop: 6,
    paddingBottom: 10,
    paddingLeft: 54,
    paddingRight: 34,
  },
  headingPlate: {
    paddingVertical: 6,
    paddingLeft: 30,
    paddingRight: 24,
  },
  heading: {
    fontSize: HEADING_SIZE,
    lineHeight: HEADING_SIZE + 4,
    letterSpacing: 1,
    color: SKIN.ink,
  },
});
