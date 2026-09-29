import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    useAnimatedProps,
    useDerivedValue,
    useFrameCallback,
    useSharedValue,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import {
    computeElapsedFraction,
    resolveRingColor,
} from "@/services/notificationHelpers";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TRACK_COLOR = "rgba(124, 58, 237, 0.15)";

interface CountdownRingProps {
  createdAt: string;
  expiresAt: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

/**
 * Circular countdown progress indicator for pending gasps.
 * Wraps an avatar (children) and shows elapsed TTL fraction as a ring.
 *
 * All animation runs on the UI thread via Reanimated shared values
 * and useFrameCallback — no JS timers, no per-item setState.
 * Satisfies Requirements 3.1, 3.2, 3.3, 3.4, 3.5.
 */
export function CountdownRing({
  createdAt,
  expiresAt: _expiresAt,
  size = 56,
  strokeWidth = 3,
  children,
}: CountdownRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const fractionSv = useSharedValue(
    computeElapsedFraction(createdAt, Date.now()),
  );

  // Update elapsed fraction every frame on the UI thread
  const frameCallback = useFrameCallback(() => {
    fractionSv.value = computeElapsedFraction(createdAt, Date.now());
  });

  // Cleanup: cancel the frame callback on unmount
  useEffect(() => {
    return () => {
      frameCallback.setActive(false);
      cancelAnimation(fractionSv);
    };
  }, [frameCallback, fractionSv]);

  // Derive stroke color based on elapsed fraction threshold
  const strokeColor = useDerivedValue(() => resolveRingColor(fractionSv.value));

  // Animated props for the progress circle
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * fractionSv.value,
    stroke: strokeColor.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={TRACK_COLOR}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress ring */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      {/* Avatar slot — absolutely centered inside the ring */}
      {children && <View style={styles.childrenContainer}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  childrenContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});
