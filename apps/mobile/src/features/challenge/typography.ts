import type { TextStyle } from 'react-native';

// M PLUS Rounded 1c Bold for everything the challenge counts with: the timer,
// the calculations and the keypad. Embedded by the expo-font plugin in
// app.config.ts under its iOS PostScript name, which is also the family name
// registered on Android. Bold is the only weight shipped.
export const DIGITS_FONT: TextStyle = {
  fontFamily: 'RoundedMplus1c-Bold',
  fontWeight: '700',
};
