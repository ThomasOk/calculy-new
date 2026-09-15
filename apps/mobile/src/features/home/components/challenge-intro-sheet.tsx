import type { BottomSheetBackdropProps, BottomSheetBackgroundProps } from '@gorhom/bottom-sheet';
import type { LayoutChangeEvent } from 'react-native';
import type { Challenge } from '@/features/challenge/challenges';
import type { EntranceStyle } from '@/features/challenge/prototype-not-boring/pagaille-style';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import * as React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Easing, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { G, Polygon, Rect, Svg } from 'react-native-svg';
import { Text, View } from '@/components/ui';
import { CHALLENGES, challengeTitle } from '@/features/challenge/challenges';
import { sheetLandHaptic } from '@/features/challenge/haptics';
import { MenuButton } from '@/features/challenge/prototype-not-boring/pagaille-menu';
import { fadeIn, GOTHIC, STAMP_MS, stampIn } from '@/features/challenge/prototype-not-boring/pagaille-style';
import { SKINS } from '@/features/challenge/prototype-not-boring/skins';
import { CountBox } from '@/features/home/components/count-box';
import { translate } from '@/lib/i18n';

// The challenge's sheet, as the menu's item that was picked opening up: its
// count in the items' white box (count-box.tsx) and the word, three short
// lines on how a run goes, Start as the selected menu item; on a page whose
// top edge is cut like a bolt, over a strip of accent paint.
// Swiping it down or tapping the backdrop cancels, like the Cancel button.
//
// Quick, because it opens before every run started from the home screen:
// - Nothing to wait for on the tap. No handle, and its height known ahead,
//   measured once on an unseen copy of its content: sized on its content,
//   the sheet would wait for that content's layout before moving.
// - SHEET_MS on a strong ease-out that stops dead, no spring: its count is
//   stamped down as it lands, and onStamped goes as the stamp hits, for the
//   menu's sound.
// Reduced motion: the rise is skipped (Reanimated's default under the
// system setting) and the count fades in.

const SKIN = SKINS.white;
const SHEET_MS = 170;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const COUNT_SIZE = 84;
const BUTTON_LEAN = [-2, 1.5];
// Gorhom's index for a closed sheet.
const CLOSED = -1;
// The page's top edge, cut like a bolt over a strip of paint, drawn in a
// 390 × 60 box stretched to the screen's width, EDGE_RISE above the page's
// top. From EDGE_RISE down, the page is whole.
const EDGE_BOX = '0 0 390 60';
const EDGE_RISE = 30;
const EDGE_PAINT = '0,44 180,20 168,34 404,-6 404,26 196,52 208,40 0,70';
const EDGE_PAGE = '0,60 179,40 168,52 390,30 390,60';

// Built once: a new keyframes object on a re-render could replay the entrance.
const COUNT_IN = stampIn(SHEET_MS);
const COUNT_IN_STILL = fadeIn(SHEET_MS);

function noop() {}

type Props = {
  ref: React.Ref<BottomSheetModal>;
  challenge: Challenge | null;
  onStart: () => void;
  onCancel: () => void;
  // As the count's stamp hits, each time the sheet opens.
  onStamped: () => void;
  // As the sheet starts going away, however it's closed: its button, a
  // swipe, the backdrop, or dismissed from outside.
  onClosing: () => void;
  onDismiss: () => void;
};

export function ChallengeIntroSheet({ ref, challenge, onStart, onCancel, onStamped, onClosing, onDismiss }: Props) {
  const reducedMotion = useReducedMotion();
  const animationConfigs = useBottomSheetTimingConfigs({ duration: SHEET_MS, easing: EASE_OUT });
  // 0 until the unseen copy is measured: until then, the sheet sizes itself
  // on its content.
  const [height, setHeight] = React.useState(0);
  const snapPoints = React.useMemo(() => (height > 0 ? [height] : undefined), [height]);
  // Every challenge's content has the same height: any will do.
  const sample = challenge ?? CHALLENGES[0];
  const onAnimate = (_fromIndex: number, toIndex: number) => {
    if (toIndex === CLOSED)
      onClosing();
  };
  return (
    <>
      <View
        pointerEvents="none"
        style={styles.unseen}
        onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {sample && <SheetContent challenge={sample} onStart={noop} onCancel={noop} />}
      </View>
      <BottomSheetModal
        ref={ref}
        animationConfigs={animationConfigs}
        snapPoints={snapPoints}
        enableDynamicSizing={height === 0}
        handleComponent={null}
        backdropComponent={renderBackdrop}
        backgroundComponent={SheetBackground}
        onAnimate={onAnimate}
        onDismiss={onDismiss}
      >
        <BottomSheetView>
          {challenge && (
            <SheetContent
              challenge={challenge}
              onStart={onStart}
              onCancel={onCancel}
              entrance={reducedMotion ? COUNT_IN_STILL : COUNT_IN}
              onStamped={onStamped}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

type ContentProps = {
  challenge: Challenge;
  onStart: () => void;
  onCancel: () => void;
  // The count's, as the sheet lands; none on the unseen copy.
  entrance?: EntranceStyle;
  // As the count's stamp hits; none on the unseen copy.
  onStamped?: () => void;
};

function SheetContent({ challenge, onStart, onCancel, entrance, onStamped }: ContentProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  // The content mounts as the sheet is presented, and the count's entrance
  // runs from then: its stamp hits SHEET_MS + STAMP_MS later.
  React.useEffect(() => {
    if (!onStamped)
      return;
    const timeout = setTimeout(() => {
      sheetLandHaptic();
      onStamped();
    }, SHEET_MS + STAMP_MS);
    return () => clearTimeout(timeout);
  }, [onStamped]);
  const facts = [
    { mark: <OperatorsMark />, label: translate('challenge.intro.operations') },
    { mark: <Text style={[GOTHIC, styles.mark]}>3·2·1</Text>, label: translate('challenge.intro.countdown') },
    { mark: <Text style={[GOTHIC, styles.mark]}>00:00</Text>, label: translate('challenge.intro.speed') },
  ];
  return (
    <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head} accessible accessibilityRole="header" accessibilityLabel={challengeTitle(challenge)}>
        <CountBox count={challenge.problemCount} size={COUNT_SIZE} entrance={entrance} />
        <Text style={[GOTHIC, styles.word]} numberOfLines={1}>
          {translate('home.calculations').toUpperCase()}
        </Text>
      </View>
      <View style={styles.facts}>
        {facts.map(fact => (
          <View key={fact.label} style={styles.fact} accessible accessibilityLabel={fact.label}>
            <View style={styles.markPlace}>{fact.mark}</View>
            <Text style={[GOTHIC, styles.factLabel]} numberOfLines={1}>
              {fact.label.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <View style={styles.start}>
          <MenuButton
            label={translate('challenge.intro.start')}
            primary
            lean={BUTTON_LEAN[0] ?? 0}
            skin={SKIN}
            onPress={onStart}
            reducedMotion={reducedMotion}
          />
        </View>
        <View style={styles.cancel}>
          <MenuButton
            label={translate('challenge.intro.cancel')}
            primary={false}
            lean={BUTTON_LEAN[1] ?? 0}
            skin={SKIN}
            onPress={onCancel}
            reducedMotion={reducedMotion}
          />
        </View>
      </View>
    </View>
  );
}

// A run's operators, drawn as flat bars like the home screen's giant ones.
function OperatorsMark() {
  return (
    <Svg width={70} height={20} viewBox="0 0 70 20" fill={SKIN.accent}>
      <Rect x={0} y={7} width={18} height={6} />
      <Rect x={6} y={1} width={6} height={18} />
      <Rect x={26} y={7} width={18} height={6} />
      <G transform="rotate(45 61 10)">
        <Rect x={52} y={7} width={18} height={6} />
        <Rect x={58} y={1} width={6} height={18} />
      </G>
    </Svg>
  );
}

// Pagaille's page, square — nothing is rounded in Persona's menus — its top
// edge cut like a bolt over a strip of accent paint.
function SheetBackground({ style }: BottomSheetBackgroundProps) {
  const { width } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={[style, styles.background]}>
      <Svg style={styles.edge} width={width} height={EDGE_RISE * 2} viewBox={EDGE_BOX} preserveAspectRatio="none">
        <Polygon points={EDGE_PAINT} fill={SKIN.accent} />
        <Polygon points={EDGE_PAGE} fill={SKIN.background} />
      </Svg>
      <View style={[styles.page, { backgroundColor: SKIN.background }]} />
    </View>
  );
}

// Driven by the sheet's position, so it dims and clears in step with a drag.
function renderBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
    />
  );
}

const styles = StyleSheet.create({
  // Laid out with the screen, never seen: only its height is used.
  unseen: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  background: {
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  edge: {
    position: 'absolute',
    left: 0,
    top: -EDGE_RISE,
  },
  page: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: EDGE_RISE,
    bottom: 0,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 46,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: 4,
  },
  word: {
    flexShrink: 1,
    fontSize: 46,
    lineHeight: 52,
    letterSpacing: 1,
    color: SKIN.ink,
  },
  facts: {
    marginTop: 14,
    gap: 10,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  markPlace: {
    width: 74,
  },
  mark: {
    fontSize: 27,
    lineHeight: 30,
    letterSpacing: 1,
    color: SKIN.accent,
    fontVariant: ['tabular-nums'],
  },
  factLabel: {
    flexShrink: 1,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 1,
    color: SKIN.ink,
  },
  actions: {
    marginTop: 26,
    gap: 14,
  },
  start: {
    marginRight: 28,
  },
  cancel: {
    marginLeft: 44,
  },
});
