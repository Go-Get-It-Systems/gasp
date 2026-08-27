import { View, StyleSheet } from 'react-native';
import { Text } from './Text';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /** Number to display. Badge is hidden when count is 0 */
  count: number;
  /** Badge size */
  size?: BadgeSize;
}

const SIZE_CONFIG: Record<BadgeSize, { minWidth: number; height: number; fontSize: number; paddingHorizontal: number }> = {
  sm: { minWidth: 18, height: 18, fontSize: 10, paddingHorizontal: 4 },
  md: { minWidth: 22, height: 22, fontSize: 12, paddingHorizontal: 6 },
};

export function Badge({ count, size = 'md' }: BadgeProps) {
  if (count <= 0) {
    return null;
  }

  const config = SIZE_CONFIG[size];
  const displayText = count > 99 ? '99+' : String(count);

  return (
    <View
      style={[
        styles.badge,
        {
          minWidth: config.minWidth,
          height: config.height,
          borderRadius: config.height / 2,
          borderCurve: 'continuous',
          paddingHorizontal: config.paddingHorizontal,
        },
      ]}
    >
      <Text
        variant="caption"
        weight="700"
        color="#FFFFFF"
        style={{ fontSize: config.fontSize, lineHeight: config.height }}
      >
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
