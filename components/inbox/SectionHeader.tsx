import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  count: number;
  badgeColor: string;
}

export function SectionHeader({ icon, title, count, badgeColor }: SectionHeaderProps) {
  return (
    <View style={styles.container} accessibilityRole="header">
      <View style={styles.left}>
        {icon}
        <Text variant="caption" style={styles.title}>{title}</Text>
      </View>
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text variant="caption" style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
