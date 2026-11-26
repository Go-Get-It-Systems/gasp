import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock3, Eye, Video } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { Gasp } from '@/services/api/schemas/gasp.schema';
import { getPrivacySafeImageSource } from '@/services/socialPulse';
import { CountdownRing } from './CountdownRing';

interface OpenNowItemProps {
  gasp: Gasp;
  isLoading: boolean;
  featured?: boolean;
  onPress: (gasp: Gasp) => void;
}

export function OpenNowItem({ gasp, isLoading, featured = false, onPress }: OpenNowItemProps) {
  const { t } = useTranslation();
  const millisecondsLeft = new Date(gasp.expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(1, Math.ceil(millisecondsLeft / 3_600_000));
  const urgent = millisecondsLeft <= 2 * 3_600_000;
  const [pressed, setPressed] = useState(false);

  // The card look lives on a plain View: the function form of Pressable's
  // `style` was not applied on device, which rendered the featured card
  // edge-to-edge with no padding, border or height.
  return (
    <Pressable
      onPress={() => onPress(gasp)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isLoading}
      style={featured ? styles.featured : styles.compact}
      accessibilityRole="button"
      accessibilityLabel={t('gasps.pulse.openFrom', { name: gasp.senderName })}
      accessibilityHint={t('gasps.pulse.tapToOpen')}
    >
      <View style={[styles.card, urgent && styles.urgentCard, pressed && styles.pressed]}>
        {gasp.blurhash ? (
          <Image source={getPrivacySafeImageSource(gasp.blurhash)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={['#24143D', '#18223F', '#11111D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <LinearGradient
          colors={['rgba(8,8,14,0.18)', 'rgba(8,8,14,0.9)']}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.topRow}>
          <CountdownRing createdAt={gasp.createdAt} expiresAt={gasp.expiresAt} size={46} strokeWidth={2.5}>
            <Avatar uri={gasp.senderAvatarUrl} size={38} initials={gasp.senderName} />
          </CountdownRing>
          {gasp.mediaType === 'video' ? (
            <View style={styles.mediaBadge}><Video size={14} color="#FFFFFF" /></View>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <Text variant="body" weight="700" numberOfLines={1} style={styles.name}>{gasp.senderName}</Text>
          <View style={styles.metaRow}>
            {urgent ? <Clock3 size={13} color={colors.warning} /> : <Eye size={13} color={colors.accentCyan} />}
            <Text variant="caption" style={[styles.meta, urgent && styles.urgentText]}>
              {urgent
                ? t('gasps.pulse.expiresInHours', { count: hoursLeft })
                : t('gasps.pulse.tapToOpen')}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 204,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: 14,
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.45)',
  },
  compact: { width: 154 },
  featured: {
    alignSelf: 'stretch',
    marginHorizontal: 20,
  },
  urgentCard: { borderColor: 'rgba(245,158,11,0.72)' },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  mediaBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,15,0.64)',
  },
  bottom: { gap: 5 },
  name: { fontSize: 16, color: '#FFFFFF' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 11, color: 'rgba(255,255,255,0.74)' },
  urgentText: { color: colors.warning },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,14,0.56)',
  },
});
