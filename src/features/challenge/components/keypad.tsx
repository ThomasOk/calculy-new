import type { TextStyle } from 'react-native';
import type { CSSTransitionProperties } from 'react-native-reanimated';
import type { GlossTone } from '@/features/challenge/components/gloss-styles';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Pressable, Text, View } from '@/components/ui';
import { GlossFace, GlossHighlight } from '@/features/challenge/components/gloss';
import {
  EMBOSSED_TEXT,
  ENGRAVED_TEXT,
  GLOSS_BLUE_LABEL,
  GLOSS_DROP_SHADOW,
  GLOSS_INK,
} from '@/features/challenge/components/gloss-styles';
import { keyTapHaptic } from '@/features/challenge/haptics';
import { DIGITS_FONT } from '@/features/challenge/typography';
import { translate } from '@/lib/i18n';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
// Outside StyleSheet.create: React Native's style types reject Reanimated's
// transition props. See problem-carousel.tsx.
const KEY_TRANSITION = {
  transition: `transform 120ms ${EASE_OUT}, opacity 120ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;
// A held key fades a shade in over its face: gradients can't be transitioned.
const SHADE_TRANSITION = {
  transition: `opacity 100ms ${EASE_OUT}`,
} satisfies CSSTransitionProperties;
const DIGIT_ROWS = [[7, 8, 9], [4, 5, 6], [1, 2, 3]];
const KEY_HEIGHT = 64;
const KEY_RADIUS = 12;

type KeyKind = 'digit' | 'erase' | 'confirm';

const KEY_TONES: Record<KeyKind, GlossTone> = {
  digit: 'pearl',
  erase: 'blue',
  confirm: 'green',
};

const LABEL_STYLES: Record<KeyKind, TextStyle> = {
  digit: { ...ENGRAVED_TEXT, color: GLOSS_INK },
  erase: { ...ENGRAVED_TEXT, color: GLOSS_BLUE_LABEL },
  confirm: { ...EMBOSSED_TEXT, color: '#FFFFFF' },
};

type Props = {
  onDigit: (digit: number) => void;
  onErase: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
  disabled?: boolean;
};

export function Keypad({ onDigit, onErase, onConfirm, canConfirm, disabled = false }: Props) {
  const reducedMotion = useReducedMotion();
  return (
    <View className="gap-3 px-4 pb-4">
      {DIGIT_ROWS.map(row => (
        <View key={row.join()} className="flex-row gap-3">
          {row.map(digit => (
            <Key
              key={digit}
              label={String(digit)}
              onPress={() => onDigit(digit)}
              disabled={disabled}
              reducedMotion={reducedMotion}
            />
          ))}
        </View>
      ))}
      <View className="flex-row gap-3">
        <Key
          kind="erase"
          label="⌫"
          accessibilityLabel={translate('challenge.erase')}
          onPress={onErase}
          disabled={disabled}
          reducedMotion={reducedMotion}
        />
        <Key
          label="0"
          onPress={() => onDigit(0)}
          disabled={disabled}
          reducedMotion={reducedMotion}
        />
        <Key
          kind="confirm"
          label="="
          accessibilityLabel={translate('challenge.confirm')}
          onPress={onConfirm}
          disabled={disabled || !canConfirm}
          reducedMotion={reducedMotion}
        />
      </View>
    </View>
  );
}

type KeyProps = {
  label: string;
  onPress: () => void;
  disabled: boolean;
  reducedMotion: boolean;
  kind?: KeyKind;
  accessibilityLabel?: string;
};

function Key({ label, onPress, disabled, reducedMotion, kind = 'digit', accessibilityLabel }: KeyProps) {
  const [pressed, setPressed] = React.useState(false);
  return (
    <Pressable
      className="flex-1"
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        // On touch-down like the system keyboard, together with the key
        // shrinking, rather than on release when the digit registers. Not on
        // confirm: the answer's success or error haptic replaces it.
        if (kind !== 'confirm')
          keyTapHaptic();
      }}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      pressRetentionOffset={16}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          styles.key,
          KEY_TRANSITION,
          // Reduced motion keeps the shade and drops the shrink.
          pressed && !reducedMotion && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <GlossFace layer={KEY_TONES[kind]} radius={KEY_RADIUS} />
        <GlossFace
          layer="pressed"
          radius={KEY_RADIUS}
          style={[SHADE_TRANSITION, { opacity: pressed ? 1 : 0 }]}
        />
        <GlossHighlight radius={KEY_RADIUS} />
        <Text className="text-2xl" style={[DIGITS_FONT, LABEL_STYLES[kind]]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: {
    minHeight: KEY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: KEY_RADIUS,
    boxShadow: GLOSS_DROP_SHADOW,
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
