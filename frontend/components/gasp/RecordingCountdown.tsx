import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { mediumHaptic, heavyHaptic } from '@/utils/haptics';

interface RecordingCountdownProps {
  isActive: boolean;
  onCountdownComplete: () => void;
}

export function RecordingCountdown({ isActive, onCountdownComplete }: RecordingCountdownProps) {
  const [count, setCount] = useState<number | null>(null);
  const [showDot, setShowDot] = useState(false);
  const onCountdownCompleteRef = useRef(onCountdownComplete);
  onCountdownCompleteRef.current = onCountdownComplete;

  // Shared values for number animation (UI thread)
  const numberScale = useSharedValue(0);
  const numberOpacity = useSharedValue(0);

  // Shared value for pulsing dot (UI thread)
  const dotOpacity = useSharedValue(0);

  // Animate number in when count changes
  useEffect(() => {
    if (count === null) return;
    numberScale.value = 0;
    numberOpacity.value = 0;
    numberScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) });
    numberOpacity.value = withTiming(1, { duration: 200 });
  }, [count, numberScale, numberOpacity]);

  // Start pulsing dot when showDot becomes true
  useEffect(() => {
    if (showDot) {
      dotOpacity.value = 1;
      dotOpacity.value = withRepeat(
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      dotOpacity.value = 0;
    }
  }, [showDot, dotOpacity]);

  const countdownStartedRef = useRef(false);

  // Countdown logic: 3 -> 2 -> 1 -> complete, cancelled if isActive becomes false
  useEffect(() => {
    if (!isActive) {
      countdownStartedRef.current = false;
      setCount(null);
      setShowDot(false);
      numberScale.value = 0;
      numberOpacity.value = 0;
      dotOpacity.value = 0;
      return;
    }

    // Guard: prevent re-running if already counting down (e.g. re-render mid-countdown)
    if (countdownStartedRef.current) return;
    countdownStartedRef.current = true;

    setCount(3);
    setShowDot(false);
    mediumHaptic();

    let current = 3;
    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCount(current);
        mediumHaptic();
      } else {
        clearInterval(interval);
        setCount(null);
        setShowDot(true);
        heavyHaptic();
        onCountdownCompleteRef.current();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const numberAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
    opacity: numberOpacity.value,
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  if (!isActive && !showDot) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {count !== null && (
        <Animated.View style={[styles.numberContainer, numberAnimatedStyle]}>
          <Text style={styles.countText}>{count}</Text>
        </Animated.View>
      )}
      {showDot && (
        <Animated.View style={[styles.dotContainer, dotAnimatedStyle]}>
          <View style={styles.dot} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  numberContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 64,
  },
  dotContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
});
