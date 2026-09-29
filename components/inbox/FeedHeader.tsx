import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/constants/colors';

interface FeedHeaderProps {
  newCount?: number;
}

export function FeedHeader({ newCount = 0 }: FeedHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text variant="title" style={styles.title}>
          FEED
        </Text>
        <Text variant="caption" style={styles.subtitle}>
          Hold to reveal reactions
        </Text>
      </View>

      {newCount > 0 && (
        <View style={styles.badgeContainer}>
          <Badge count={newCount} size="md" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  left: {
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontStyle: 'italic',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  badgeContainer: {
    marginTop: 4,
  },
});
