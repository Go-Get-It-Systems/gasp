import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { clsx } from 'clsx';
import { Text } from './Text';

export type OnlineStatus = 'online' | 'offline' | 'away';

export interface AvatarProps {
  /** Image URI. Shows initials/placeholder when null */
  uri: string | null;
  /** Avatar diameter in pixels */
  size?: number;
  /** Whether to show the online status indicator dot */
  showOnlineIndicator?: boolean;
  /** Current online status */
  onlineStatus?: OnlineStatus;
  /** Optional border color override */
  borderColor?: string;
  /** Initials to show when no image is available */
  initials?: string;
  /** NativeWind class names */
  className?: string;
  /** Accessibility label for screen readers. Defaults to initials when available */
  accessibilityLabel?: string;
}

const STATUS_COLORS: Record<OnlineStatus, string> = {
  online: '#22C55E',
  offline: '#6B7280',
  away: '#EAB308',
};

export function Avatar({
  uri,
  size = 48,
  showOnlineIndicator = false,
  onlineStatus = 'offline',
  borderColor,
  initials,
  className,
  accessibilityLabel,
}: AvatarProps) {
  const borderRadius = size / 2;
  const indicatorSize = Math.max(12, size * 0.25);
  const indicatorBorderWidth = Math.max(2, size * 0.05);
  const initialsFontSize = size * 0.38;

  const resolvedAccessibilityLabel =
    accessibilityLabel ?? (initials ? initials.slice(0, 2).toUpperCase() : undefined);

  return (
    <View
      className={clsx(className)}
      accessibilityRole="image"
      accessibilityLabel={resolvedAccessibilityLabel}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          borderCurve: 'continuous',
          ...(borderColor
            ? { borderWidth: 2, borderColor }
            : {}),
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius,
            },
          ]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius,
              borderCurve: 'continuous',
            },
          ]}
        >
          <Text
            variant="body"
            weight="600"
            color="#FFFFFF"
            style={{ fontSize: initialsFontSize }}
          >
            {initials ? initials.slice(0, 2).toUpperCase() : '?'}
          </Text>
        </View>
      )}

      {showOnlineIndicator ? (
        <View
          style={[
            styles.indicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              borderWidth: indicatorBorderWidth,
              borderColor: '#0A0A0F',
              backgroundColor: STATUS_COLORS[onlineStatus],
              // Position at bottom-right
              bottom: 0,
              right: 0,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'visible',
  },
  image: {
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    borderCurve: 'continuous',
  },
});
