import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { mediumHaptic, heavyHaptic, successHaptic } from '@/utils/haptics';
import { useContainerSize } from '@/hooks/useContainerSize';
import { CountdownRing } from './CountdownRing';
import { RecordingDot } from './RecordingDot';

/** Diameter of the countdown ring. The gasp starts opening from this circle. */
export const COUNTDOWN_RING_SIZE = 160;
const GLOW_SIZE = 280;
const EDGE_MARGIN = 16;
const LABEL_OFFSET = COUNTDOWN_RING_SIZE / 2 + 18;
const COUNTDOWN_S = 3;
const RELEASE_HINT_MS = 1600;

interface RecordingCountdownProps {
  isActive: boolean;
  onCountdownComplete: () => void;
  /** Where the finger landed; the ring is drawn around this point. */
  touchX: SharedValue<number>;
  touchY: SharedValue<number>;
}

export function RecordingCountdown({ isActive, onCountdownComplete, touchX, touchY }: RecordingCountdownProps) {
  const { t } = useTranslation();
  // Sized to the container (a modal sheet), not the window.
  const { width, height, onLayout } = useContainerSize();
  const [count, setCount] = useState<number | null>(null);
  const [showDot, setShowDot] = useState(false);
  const [showReleaseHint, setShowReleaseHint] = useState(false);
  const onCountdownCompleteRef = useRef(onCountdownComplete);
  onCountdownCompleteRef.current = onCountdownComplete;

  const ringProgress = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const numberScale = useSharedValue(0);
  const numberOpacity = useSharedValue(0);

  // Animate number in when count changes
  useEffect(() => {
    if (count === null) return;
    numberScale.value = 0.6;
    numberOpacity.value = 0;
    numberScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) });
    numberOpacity.value = withTiming(1, { duration: 200 });
    AccessibilityInfo.announceForAccessibility(String(count));
  }, [count, numberScale, numberOpacity]);

  useEffect(() => {
    if (!showReleaseHint) return;
    const timeout = setTimeout(() => setShowReleaseHint(false), RELEASE_HINT_MS);
    return () => clearTimeout(timeout);
  }, [showReleaseHint]);

  const countdownStartedRef = useRef(false);
  const completedRef = useRef(false);

  // Countdown logic: 3 -> 2 -> 1 -> complete, cancelled if isActive becomes false.
  // Haptics ramp up with each tick (the hold itself gives the light one on "3").
  useEffect(() => {
    if (!isActive) {
      const releasedEarly = countdownStartedRef.current && !completedRef.current;
      countdownStartedRef.current = false;
      setCount(null);
      setShowDot(false);
      cancelAnimation(ringProgress);
      // Let go before 0: the ring drains back instead of vanishing.
      ringProgress.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      ringOpacity.value = withTiming(0, { duration: 300 });
      numberOpacity.value = withTiming(0, { duration: 150 });
      if (releasedEarly) setShowReleaseHint(true);
      return;
    }

    // Guard: prevent re-running if already counting down (e.g. re-render mid-countdown)
    if (countdownStartedRef.current) return;
    countdownStartedRef.current = true;
    completedRef.current = false;

    setCount(COUNTDOWN_S);
    setShowDot(false);
    setShowReleaseHint(false);
    ringOpacity.value = withTiming(1, { duration: 150 });
    ringProgress.value = 0;
    ringProgress.value = withTiming(1, { duration: COUNTDOWN_S * 1000, easing: Easing.linear });

    let current = COUNTDOWN_S;
    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCount(current);
        if (current === 1) heavyHaptic();
        else mediumHaptic();
      } else {
        clearInterval(interval);
        completedRef.current = true;
        setCount(null);
        setShowDot(true);
        // The ring hands over to the circle the gasp opens through.
        ringOpacity.value = withTiming(0, { duration: 250 });
        successHaptic();
        onCountdownCompleteRef.current();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Keep the whole ring on screen even when the finger is near an edge.
  const minX = EDGE_MARGIN + COUNTDOWN_RING_SIZE / 2;
  const minY = EDGE_MARGIN + COUNTDOWN_RING_SIZE / 2;
  const maxX = width - minX;
  const maxY = height - minY;

  const ringStyle = useAnimatedStyle(() => {
    const cx = Math.min(Math.max(touchX.get(), minX), maxX);
    const cy = Math.min(Math.max(touchY.get(), minY), maxY);
    return {
      opacity: ringOpacity.get(),
      transform: [{ translateX: cx - GLOW_SIZE / 2 }, { translateY: cy - GLOW_SIZE / 2 }],
    };
  });

  // Label sits under the ring, or above it when the finger is near the bottom.
  const labelStyle = useAnimatedStyle(() => {
    const cx = Math.min(Math.max(touchX.get(), minX), maxX);
    const cy = Math.min(Math.max(touchY.get(), minY), maxY);
    const below = cy + LABEL_OFFSET + 40 < height;
    return {
      top: below ? cy + LABEL_OFFSET : cy - LABEL_OFFSET - 24,
      // The label row spans the screen; shift it so it centers under the ring.
      transform: [{ translateX: cx - width / 2 }],
    };
  });

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.get() }],
    opacity: numberOpacity.get(),
  }));

  if (!isActive && !showDot && !showReleaseHint) return null;

  const label = count !== null ? t('viewGasp.keepHolding') : showReleaseHint ? t('viewGasp.keepHoldingToOpen') : null;

  return (
    <View style={styles.container} pointerEvents="none" onLayout={onLayout}>
      <Animated.View style={[styles.ring, ringStyle]}>
        <CountdownRing progress={ringProgress} size={COUNTDOWN_RING_SIZE} glowSize={GLOW_SIZE} />
        <Animated.View style={[styles.numberContainer, numberStyle]}>
          {count !== null && <Text style={styles.countText}>{count}</Text>}
        </Animated.View>
      </Animated.View>
      {label && (
        <Animated.View style={[styles.labelContainer, labelStyle]}>
          <Text style={styles.label}>{label}</Text>
        </Animated.View>
      )}
      {showDot && <RecordingDot />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
  },
  numberContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 80,
    // Small dark shadow only: a large colored one gets clipped to the text box
    // on iOS and shows as a tinted rectangle. The pink glow comes from the ring.
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  labelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
