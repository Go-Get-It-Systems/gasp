import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { useContainerSize } from '@/hooks/useContainerSize';

interface CircleRevealProps {
  /** 0 = hidden, 1 = fully revealed. */
  progress: SharedValue<number>;
  /** Point the circle grows from (the finger), in screen coordinates. */
  originX: SharedValue<number>;
  originY: SharedValue<number>;
  /** Radius the circle starts at (matches the countdown ring). */
  startRadius: number;
  children: ReactNode;
}

function farthestCornerDistance(x: number, y: number, width: number, height: number) {
  'worklet';
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 2;
}

/**
 * Reveals full-screen content through a circle that expands from a point.
 * The window is a fixed-size circle scaled up from the origin; the content
 * inside is counter-scaled around the same point, so it stays still while the
 * circle grows. The window and content only animate transforms on the UI thread.
 * Falls back to a plain fade when the user prefers reduced motion.
 */
export function CircleReveal({ progress, originX, originY, startRadius, children }: CircleRevealProps) {
  // Sized to the container we fill (view-gasp is a modal sheet, shorter than the window).
  const { width, height, onLayout } = useContainerSize();
  const reduceMotion = useReducedMotion();

  const windowStyle = useAnimatedStyle(() => {
    const p = progress.get();
    if (reduceMotion) {
      return { left: 0, top: 0, width, height, borderRadius: 0, opacity: p, transform: [{ scale: 1 }] };
    }
    const x = originX.get();
    const y = originY.get();
    const maxR = farthestCornerDistance(x, y, width, height);
    const scale = interpolate(p, [0, 1], [startRadius / maxR, 1], Extrapolation.CLAMP);
    return {
      left: x - maxR,
      top: y - maxR,
      width: maxR * 2,
      height: maxR * 2,
      borderRadius: maxR,
      opacity: p > 0 ? 1 : 0,
      transform: [{ scale }],
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { left: 0, top: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    }
    const x = originX.get();
    const y = originY.get();
    const maxR = farthestCornerDistance(x, y, width, height);
    const scale = interpolate(progress.get(), [0, 1], [startRadius / maxR, 1], Extrapolation.CLAMP);
    const k = 1 / scale;
    // Content is laid out at screen size, offset so screen coords line up with
    // the window. Scaling by k around its own center moves the origin point;
    // translate it back so the origin stays fixed: t = (1 - k) * (origin - center).
    const localX = x - (x - maxR);
    const localY = y - (y - maxR);
    const centerX = (x - maxR) * -1 + width / 2;
    const centerY = (y - maxR) * -1 + height / 2;
    return {
      left: -(x - maxR),
      top: -(y - maxR),
      transform: [
        { translateX: (1 - k) * (localX - centerX) },
        { translateY: (1 - k) * (localY - centerY) },
        { scale: k },
      ],
    };
  });

  // Glowing edge that rides the circle and fades out as it reaches the edges.
  const edgeStyle = useAnimatedStyle(() => {
    const p = progress.get();
    if (reduceMotion) return { opacity: 0 };
    const x = originX.get();
    const y = originY.get();
    const maxR = farthestCornerDistance(x, y, width, height);
    const r = interpolate(p, [0, 1], [startRadius, maxR], Extrapolation.CLAMP);
    return {
      left: x - r,
      top: y - r,
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      opacity: interpolate(p, [0, 0.05, 0.7, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      <Animated.View style={[styles.window, windowStyle]}>
        <Animated.View style={[{ width, height }, styles.content, contentStyle]}>
          {children}
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.edge, edgeStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
  },
  edge: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: colors.accentPink,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
});
