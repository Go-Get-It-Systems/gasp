import {
  NotificationToastBackdrop,
  NotificationToastThumbnail,
} from '@/components/notifications/NotificationToastArtwork';
import { Text } from "@/components/ui/Text";
import { colors } from "@/constants/colors";
import { openNotificationRoute } from "@/services/notificationNavigation";
import { useNotificationStore } from "@/stores/notificationStore";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BANNER_HEIGHT = 76;
export function ToastBanner() {
  const insets = useSafeAreaInsets();
  const activeToast = useNotificationStore((s) => s.activeToast);
  const dequeueToast = useNotificationStore((s) => s.dequeueToast);
  const hiddenY = -(BANNER_HEIGHT + insets.top);
  const translateYSv = useSharedValue(hiddenY);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const dismiss = () => {
    clearTimer();
    dequeueToast();
  };
  const slideOut = () => {
    translateYSv.value = withTiming(hiddenY, { duration: 250 }, (done) => {
      if (done) runOnJS(dismiss)();
    });
  };

  useEffect(() => {
    if (activeToast) {
      translateYSv.value = withSpring(insets.top + 8, {
        damping: 18,
        stiffness: 200,
      });
      timerRef.current = setTimeout(slideOut, 4000);
    } else {
      translateYSv.value = hiddenY;
    }
    return () => {
      clearTimer();
      cancelAnimation(translateYSv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeToast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYSv.value }],
  }));

  const handleTap = () => {
    if (!activeToast) return;
    clearTimer();
    cancelAnimation(translateYSv);
    openNotificationRoute(activeToast.route);
    dequeueToast();
  };

  if (!activeToast) return null;
  const fallbackInitial = (activeToast.actorName ?? activeToast.title).trim().charAt(0).toUpperCase() || '?';

  return (
    <Animated.View
      style={[styles.wrapper, animatedStyle]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handleTap}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`${activeToast.title}: ${activeToast.body}`}
      >
        <NotificationToastBackdrop {...activeToast} />
        <View style={styles.row}>
          <NotificationToastThumbnail {...activeToast} fallbackInitial={fallbackInitial} />
          <View style={styles.col}>
            <Text variant="body" weight="600" numberOfLines={1}>
              {activeToast.title}
            </Text>
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {activeToast.body}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: BANNER_HEIGHT,
    zIndex: 9999,
  },
  card: {
    flex: 1,
    borderRadius: 8,
    borderCurve: "continuous",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
  },
  col: { flex: 1, justifyContent: "center" },
});
