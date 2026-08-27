import { colors } from '@/constants/colors';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

interface ReactionThumbnail {
  id: string;
  thumbnailUrl: string;
}

interface FeaturedReactionsGridProps {
  reactions: ReactionThumbnail[];
  onReactionPress?: (id: string) => void;
}

const GAP = 4;
const COLUMNS = 3;

export function FeaturedReactionsGrid({
  reactions,
  onReactionPress,
}: FeaturedReactionsGridProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  // itemWidth derived from the actual rendered container width — works on web and native
  const itemWidth = containerWidth > 0
    ? (containerWidth - GAP * (COLUMNS - 1)) / COLUMNS
    : 0;
  const itemHeight = itemWidth * 1.25; // portrait 4:5 ratio

  // Show up to 6 thumbnails (2 rows × 3 cols), pad with placeholders
  const items = reactions.slice(0, 6);
  while (items.length < 6) {
    items.push({ id: `placeholder-${items.length}`, thumbnailUrl: '' });
  }

  return (
    <View style={styles.grid} onLayout={handleLayout}>
      {containerWidth > 0 && items.map((item, index) => (
        <Pressable
          key={item.id}
          style={[styles.cell, { width: itemWidth, height: itemHeight }]}
          onPress={() => item.thumbnailUrl && onReactionPress?.(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Featured reaction ${index + 1}`}
        >
          {item.thumbnailUrl ? (
            <>
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.playOverlay}>
                <View style={styles.playIconBg}>
                  <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              </View>
            </>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    // No paddingHorizontal here — the parent section already has paddingHorizontal: 16
  },
  cell: {
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
  },
  placeholder: {
    backgroundColor: colors.surfaceElevated,
  },
  playOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  playIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
