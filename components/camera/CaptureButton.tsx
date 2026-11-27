import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';
import { lightHaptic, mediumHaptic } from '@/utils/haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MAX_DURATION = 10; // seconds — must match useCamera's maxDuration

interface CaptureButtonProps {
  onCapture: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  isRecording?: boolean;
  size?: number;
}

export function CaptureButton({
  onCapture,
  onLongPressStart,
  onLongPressEnd,
  isRecording = false,
  size = 72,
}: CaptureButtonProps) {
  const pressed = useSharedValue(0);
  const recording = useSharedValue(0);
  const progress = useSharedValue(0);

  const ringSize = size + 16;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate progress ring for the full duration when recording starts
  useEffect(() => {
    if (isRecording) {
      progress.set(0);
      progress.set(
        withTiming(1, { duration: MAX_DURATION * 1000, easing: Easing.linear }),
      );
    } else {
      progress.set(withTiming(0, { duration: 200 }));
    }
  }, [isRecording, progress]);

  const tap = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withTiming(1, { duration: 80 }));
      runOnJS(lightHaptic)();
    })
    .onFinalize(() => {
      pressed.set(withTiming(0, { duration: 150 }));
    })
    .onEnd((_event, success) => {
      // A cancelled tap must not take a photo after a failed/interrupted hold.
      if (success) runOnJS(onCapture)();
    });

  const longPress = Gesture.LongPress()
    .minDuration(300)
    // Allow travel across the entire visible ring, not the native 10pt default.
    .maxDistance(ringSize)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      recording.set(withTiming(1, { duration: 200 }));
      runOnJS(mediumHaptic)();
      if (onLongPressStart) {
        runOnJS(onLongPressStart)();
      }
    })
    .onEnd(() => {
      // Both release and system cancellation must stop an active recording.
      recording.set(withTiming(0, { duration: 200 }));
      if (onLongPressEnd) {
        runOnJS(onLongPressEnd)();
      }
    });

  const gesture = Gesture.Exclusive(longPress, tap);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pressed.get(), [0, 1], [1, 0.92]) },
    ],
    borderColor: interpolate(recording.get(), [0, 1], [1, 0]) > 0.5
      ? '#FFFFFF'
      : 'rgba(255,255,255,0.3)',
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(recording.get(), [0, 1], [1, 0.5]) },
    ],
    borderRadius: interpolate(recording.get(), [0, 1], [(size - 8) / 2, 8]),
    backgroundColor: interpolate(recording.get(), [0, 1], [0, 1]) > 0.5
      ? '#EF4444'
      : '#FFFFFF',
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(recording.get(), [0, 1], [0, 1]),
    transform: [
      { rotate: '-90deg' },
    ],
  }));

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Take photo"
        accessibilityHint="Long press to record video"
        style={[styles.wrapper, { width: ringSize, height: ringSize }]}
      >
        {/* The fixed wrapper owns touch input; animated visuals never shrink it. */}
        <Animated.View pointerEvents="none" style={[styles.ringContainer, ringStyle]}>
          <Svg width={ringSize} height={ringSize}>
            <AnimatedCircle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="#EF4444"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animatedProps={animatedCircleProps}
            />
          </Svg>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.outer,
            { width: size, height: size, borderRadius: size / 2 },
            outerStyle,
          ]}
        >
          <Animated.View
            style={[
              styles.inner,
              { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 },
              innerStyle,
            ]}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outer: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    backgroundColor: '#FFFFFF',
    borderCurve: 'continuous',
  },
});
