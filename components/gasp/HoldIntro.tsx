import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Hand, Video } from 'lucide-react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { GaspMediaType } from '@/services/api/schemas/gasp.schema';

interface HoldIntroProps {
  senderName: string;
  mediaType: GaspMediaType;
  /** Gasp length in seconds, when known (video duration loads async). */
  durationS?: number | null;
  isHolding: SharedValue<number>;
  isRevealed: SharedValue<number>;
}

/**
 * What the viewer sees before holding: who sent the gasp, what it is, where to
 * hold and that the front camera records while holding. Fades out on hold and
 * never comes back once the gasp has been revealed.
 */
export function HoldIntro({ senderName, mediaType, durationS, isHolding, isRevealed }: HoldIntroProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const initial = senderName.trim().charAt(0).toUpperCase() || '?';
  const type = mediaType === 'video' ? t('viewGasp.video') : t('viewGasp.photo');
  const meta = durationS ? `${type} · ${durationS}s` : type;

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(isHolding.get(), [0, 1], [1, 0]) * (1 - isRevealed.get()),
    transform: [{ scale: interpolate(isHolding.get(), [0, 1], [1, 0.96]) }],
  }));

  return (
    <Animated.View style={[styles.overlay, style]} pointerEvents="none">
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.accentCyan, colors.accentPink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initial}</Text>
        </LinearGradient>
        <Text style={styles.title}>{t('viewGasp.sentYouAGasp', { name: senderName })}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>

      <View style={[styles.holdArea, { bottom: insets.bottom + 72 }]}>
        <View style={styles.holdTarget}>
          <View style={styles.holdInner}>
            <Hand size={34} color="#FFFFFF" strokeWidth={1.8} />
          </View>
        </View>
        <Text style={styles.holdLabel}>{t('viewGasp.pressAndHold')}</Text>
        <View style={styles.notice}>
          <Video size={16} color="#FFFFFF" />
          <Text style={styles.noticeText}>{t('viewGasp.recordingHint')}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  header: {
    position: 'absolute',
    top: '30%',
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  meta: { fontSize: 14, color: 'rgba(255, 255, 255, 0.75)' },
  holdArea: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 16,
  },
  holdTarget: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdLabel: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  noticeText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
});
