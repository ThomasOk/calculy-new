import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';
import type { CSSTransitionProperties } from 'react-native-reanimated';
import type { GlossTone } from '@/features/challenge/components/gloss-styles';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Pressable } from '@/components/ui';
import { GlossFace, GlossHighlight } from '@/features/challenge/components/gloss';
import { GLOSS_DROP_SHADOW } from '@/features/challenge/components/gloss-styles';
import { menuTapHaptic } from '@/features/challenge/haptics';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
// The keypad keys' press: shrinks and shades on touch-down. See keypad.tsx.
const PRESS_TRANSITION = {
  transition: `transform 120ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;
const SHADE_TRANSITION = {
  transition: `opacity 100ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;

type Props = Omit<PressableProps, 'style' | 'children'> & {
  radius: number;
  tone?: GlossTone;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// A button in the glossy recipe of gloss-styles.ts, pearl unless told otherwise.
export function GlossPressable({ radius, tone = 'pearl', style, children, onPressIn, onPressOut, ...props }: Props) {
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = React.useState(false);
  return (
    <Pressable
      pressRetentionOffset={16}
      accessibilityRole="button"
      {...props}
      onPressIn={(event: GestureResponderEvent) => {
        setPressed(true);
        menuTapHaptic();
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        setPressed(false);
        onPressOut?.(event);
      }}
    >
      <Animated.View
        style={[
          styles.button,
          { borderRadius: radius },
          style,
          PRESS_TRANSITION,
          // Reduced motion keeps the shade and drops the shrink.
          pressed && !reducedMotion && styles.pressed,
        ]}
      >
        <GlossFace layer={tone} radius={radius} />
        <GlossFace
          layer="pressed"
          radius={radius}
          style={[SHADE_TRANSITION, { opacity: pressed ? 1 : 0 }]}
        />
        <GlossHighlight radius={radius} />
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    boxShadow: GLOSS_DROP_SHADOW,
    transform: [{ scale: 1 }],
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});
