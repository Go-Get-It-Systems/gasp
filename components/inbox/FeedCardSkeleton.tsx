import { StyleSheet, View, Dimensions } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonText } from '@/components/ui/SkeletonText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HORIZONTAL_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.15;

interface FeedCardSkeletonProps {
  count?: number;
}

export function FeedCardSkeleton({ count = 4 }: FeedCardSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.cardWrapper}>
          {/* Card rectangle matching the real FeedCard */}
          <Skeleton
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            borderRadius={18}
          />
          {/* Sender name line below */}
          <View style={styles.nameRow}>
            <SkeletonText lines={1} widths={['40%']} />
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
  cardWrapper: {
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  nameRow: {
    marginTop: 8,
  },
});
