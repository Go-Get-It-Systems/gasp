import { useEffect } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { colors } from '@/constants/colors';
import { useTranslation } from 'react-i18next';

export function ConnectionBanner() {
  const status = useConnectionStatus();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const { t } = useTranslation();

  useEffect(() => {
    if (status === 'online') {
      translateY.value = withDelay(300, withTiming(-100, { duration: 300 }));
    } else {
      translateY.value = withTiming(0, { duration: 300 });
    }
  }, [status, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const isOffline = status === 'offline';
  const message = isOffline
    ? t('connection.offline')
    : t('connection.reconnecting');

  return (
    <Animated.View style={[styles.banner, { paddingTop: insets.top + 8 }, animatedStyle]}>
      {isOffline ? (
        <WifiOff size={16} color="#FFFFFF" />
      ) : (
        <ActivityIndicator size="small" color="#FFFFFF" />
      )}
      <Text variant="caption" style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 12,
    backgroundColor: colors.error,
    zIndex: 999,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
