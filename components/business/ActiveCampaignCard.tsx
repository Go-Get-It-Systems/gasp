import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

interface ActiveCampaignCardProps {
  title: string;
  subtitle: string;
  mediaUrl: string | null;
  onPress?: () => void;
}

export function ActiveCampaignCard({
  title,
  subtitle,
  mediaUrl,
  onPress,
}: ActiveCampaignCardProps) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Campaign: ${title}`}
    >
      {/* Background media */}
      {mediaUrl ? (
        <Image
          source={{ uri: mediaUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.mediaFallback]} />
      )}

      {/* Gradient overlay — dark at bottom so text is legible */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.92)']}
        locations={[0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Live indicator dot */}
      <View style={styles.liveDot} accessibilityLabel="Campaign live">
        <View style={styles.liveDotInner} />
      </View>

      {/* Text overlay */}
      <View style={styles.textBlock}>
        <Text style={styles.campaignTitle} numberOfLines={2}>
          {title.toUpperCase()}
        </Text>
        <Text style={styles.campaignSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    height: 200,
    borderRadius: 18,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'flex-end',
  },
  mediaFallback: {
    backgroundColor: colors.surfaceElevated,
  },
  liveDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  textBlock: {
    padding: 16,
    gap: 4,
  },
  campaignTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  campaignSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '400',
  },
});
