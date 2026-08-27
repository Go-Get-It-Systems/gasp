import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonText } from '@/components/ui/SkeletonText';
import { colors } from '@/constants/colors';

const CARD_WIDTH = 160;

interface UserCardSkeletonProps {
  count?: number;
}

export function UserCardSkeleton({ count = 4 }: UserCardSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.card}>
          {/* Avatar circle matching UserCard (64x64 ring, 54x54 inner) */}
          <View style={styles.avatarSection}>
            <Skeleton width={56} height={56} borderRadius={28} />
          </View>

          {/* Display name + username lines */}
          <View style={styles.textLines}>
            <SkeletonText lines={2} widths={['70%', '50%']} gap={6} />
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Action button rectangle */}
          <Skeleton width="100%" height={36} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: 200,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  avatarSection: {
    marginTop: 12,
    marginBottom: 10,
  },
  textLines: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  spacer: {
    flex: 1,
    minHeight: 8,
  },
});
