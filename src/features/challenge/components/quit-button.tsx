import * as React from 'react';
import { StyleSheet } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { GlossPressable } from '@/features/challenge/components/gloss-pressable';
import { GLOSS_INK } from '@/features/challenge/components/gloss-styles';
import { translate } from '@/lib/i18n';

const QUIT_BUTTON_SIZE = 40;

type Props = {
  onPress: () => void;
};

export function QuitButton({ onPress }: Props) {
  return (
    <GlossPressable
      radius={QUIT_BUTTON_SIZE / 2}
      style={styles.button}
      onPress={onPress}
      // Brings the 40pt key up to a 56pt touch target.
      hitSlop={8}
      accessibilityLabel={translate('challenge.quit')}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill={GLOSS_INK}>
        <Path d="M18.707 6.707a1 1 0 0 0-1.414-1.414L12 10.586 6.707 5.293a1 1 0 0 0-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 1 0 1.414 1.414L12 13.414l5.293 5.293a1 1 0 0 0 1.414-1.414L13.414 12l5.293-5.293Z" />
      </Svg>
    </GlossPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: QUIT_BUTTON_SIZE,
    height: QUIT_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
