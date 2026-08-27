import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface UnreadDotProps {
  count?: number;
  size?: 'sm' | 'md';
}

export function UnreadDot({ count, size = 'sm' }: UnreadDotProps) {
  const showCount = count !== undefined && count > 0;
  const dotSize = size === 'md' ? 10 : 8;
  const badgeMinWidth = size === 'md' ? 20 : 16;
  const badgeHeight = size === 'md' ? 20 : 16;
  const fontSize = size === 'md' ? 11 : 9;

  if (showCount) {
    return (
      <View
        style={[
          styles.badge,
          {
            minWidth: badgeMinWidth,
            height: badgeHeight,
            borderRadius: badgeHeight / 2,
            paddingHorizontal: size === 'md' ? 5 : 4,
          },
        ]}
        accessibilityLabel={`${count} unread`}
      >
        <Text style={[styles.badgeText, { fontSize }]}>
          {count > 99 ? '99+' : count.toString()}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.dot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
        },
      ]}
      accessibilityLabel="Unread"
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: colors.primary,
  },
  badge: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
