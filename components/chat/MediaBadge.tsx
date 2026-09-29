import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';

interface MediaBadgeProps {
  label: string;
  variant: 'gasp' | 'reaction';
}

export function MediaBadge({ label, variant }: MediaBadgeProps) {
  const badgeColors = variant === 'gasp'
    ? ['#EC4899', '#7C3AED'] as const
    : ['#7C3AED', '#4F46E5'] as const;

  return (
    <LinearGradient colors={badgeColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
      <Text variant="caption" style={styles.badgeText}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
