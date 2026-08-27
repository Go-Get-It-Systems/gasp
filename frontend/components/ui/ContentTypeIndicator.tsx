import { resolveIndicatorColor } from "@/services/notificationHelpers";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

interface ContentTypeIndicatorProps {
  type: "chat" | "gasp" | "reaction";
  pulsing?: boolean;
  size?: "sm" | "md";
}

/**
 * Color-coded unread dot that differentiates content type:
 * - purple  → chat message
 * - red     → gasp (urgent/ephemeral, can pulse)
 * - cyan    → reaction received
 *
 * Pulse animation runs entirely on the UI thread via Reanimated.
 */
export function ContentTypeIndicator({
  type,
  pulsing = false,
  size = "sm",
}: ContentTypeIndicatorProps) {
  const scaleAnim = useSharedValue(1);
  const color = resolveIndicatorColor(type);

  useEffect(() => {
    if (pulsing) {
      scaleAnim.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 150 }),
          withTiming(1.0, { duration: 850 }),
        ),
        -1,
      );
    } else {
      cancelAnimation(scaleAnim);
      scaleAnim.value = 1;
    }

    return () => {
      cancelAnimation(scaleAnim);
    };
  }, [pulsing, scaleAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    backgroundColor: color,
  }));

  const sizeStyle = size === "md" ? styles.md : styles.sm;

  return (
    <Animated.View
      style={[sizeStyle, animatedStyle]}
      accessibilityLabel={`${type} unread`}
    />
  );
}

const styles = StyleSheet.create({
  sm: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  md: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
