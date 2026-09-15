import type { ComponentProps } from 'react';
import type { GlossLayer } from '@/features/challenge/components/gloss-styles';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { HIGHLIGHT_GRADIENT, LAYER_STYLES } from '@/features/challenge/components/gloss-styles';

// Layers of the glossy recipe described in gloss-styles.ts. Both fill their
// parent, which carries the drop shadow and the content.

const HIGHLIGHT_INSET = 3;

type FaceProps = {
  layer: GlossLayer;
  radius: number;
  style?: ComponentProps<typeof Animated.View>['style'];
};

export function GlossFace({ layer, radius, style }: FaceProps) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.face, LAYER_STYLES[layer], { borderRadius: radius }, style]}
    />
  );
}

export function GlossHighlight({ radius }: { radius: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.highlight,
        {
          borderTopLeftRadius: radius - HIGHLIGHT_INSET,
          borderTopRightRadius: radius - HIGHLIGHT_INSET,
          borderBottomLeftRadius: radius / 2,
          borderBottomRightRadius: radius / 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  highlight: {
    position: 'absolute',
    top: HIGHLIGHT_INSET,
    left: HIGHLIGHT_INSET,
    right: HIGHLIGHT_INSET,
    height: '42%',
    experimental_backgroundImage: HIGHLIGHT_GRADIENT,
  },
});
