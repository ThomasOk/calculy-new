import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Android goes through the system haptics engine: the cross-platform helpers
// fall back to the Vibrator there, which buzzes instead of ticking.

export function keyTapHaptic() {
  if (Platform.OS === 'android')
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Keyboard_Tap);
  else
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function answerHaptic(isCorrect: boolean) {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHapticsAsync(
      isCorrect ? Haptics.AndroidHaptics.Confirm : Haptics.AndroidHaptics.Reject,
    );
  }
  else {
    Haptics.notificationAsync(
      isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    );
  }
}

export function menuTapHaptic() {
  if (Platform.OS === 'android')
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);
  else
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function sheetLandHaptic() {
  if (Platform.OS === 'android')
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
  else
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function countdownTickHaptic() {
  if (Platform.OS === 'android')
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick);
  else
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// A beat stronger than a tick, to mark the run actually starting.
export function countdownGoHaptic() {
  if (Platform.OS === 'android')
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
  else
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

// Heavier than the plain answer haptic, so a milestone stands out from every
// other correct answer.
export function streakMilestoneHaptic() {
  if (Platform.OS === 'android')
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
  else
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}
