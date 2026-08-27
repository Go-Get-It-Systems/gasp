import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonText } from '@/components/ui/SkeletonText';

interface ConversationListSkeletonProps {
  count?: number;
}

export function ConversationListSkeleton({ count = 6 }: ConversationListSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.row}>
          {/* Avatar circle matching FriendListItem (52x52, borderRadius 26) */}
          <Skeleton width={44} height={44} borderRadius={22} />

          {/* Name and status lines */}
          <View style={styles.textBlock}>
            <SkeletonText lines={2} widths={['60%', '40%']} gap={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    marginBottom: 16,
  },
  textBlock: {
    flex: 1,
  },
});
