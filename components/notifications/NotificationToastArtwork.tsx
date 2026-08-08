import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { ToastItem } from '@/stores/notificationStore';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { EyeOff } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

const GASP_PREVIEW_BLUR_RADIUS = 80;

type ArtworkProps = Pick<
  ToastItem,
  'kind' | 'imageUri' | 'blurhash' | 'mediaType' | 'actorAvatarUrl'
>;

export function NotificationToastBackdrop({
  kind,
  imageUri,
  blurhash,
  mediaType,
}: ArtworkProps) {
  const canRenderImage = kind === 'gasp.received' && mediaType !== 'video' && Boolean(imageUri);

  if (!canRenderImage) return <View style={styles.solid} />;

  return (
    <>
      <Image
        source={imageUri}
        placeholder={blurhash ? { blurhash } : undefined}
        style={styles.backgroundImage}
        contentFit="cover"
        blurRadius={GASP_PREVIEW_BLUR_RADIUS}
        testID="notification-toast-background"
      />
      <BlurView
        intensity={100}
        tint="dark"
        pointerEvents="none"
        style={styles.fill}
        testID="notification-toast-background-blur"
      />
      <View pointerEvents="none" style={styles.backgroundPrivacyOverlay} />
    </>
  );
}

export function NotificationToastThumbnail({
  kind,
  imageUri,
  blurhash,
  mediaType,
  actorAvatarUrl,
  fallbackInitial,
}: ArtworkProps & { fallbackInitial: string }) {
  const isGasp = kind === 'gasp.received';
  const canRenderImage = isGasp && mediaType !== 'video' && Boolean(imageUri);

  return (
    <View style={[styles.thumbnail, !isGasp && styles.avatar]}>
      {canRenderImage ? (
        <>
          <Image
            source={imageUri}
            placeholder={blurhash ? { blurhash } : undefined}
            style={styles.image}
            contentFit="cover"
            blurRadius={GASP_PREVIEW_BLUR_RADIUS}
            testID="notification-toast-visual"
          />
          <BlurView
            intensity={100}
            tint="dark"
            pointerEvents="none"
            style={styles.fill}
            testID="notification-toast-visual-blur"
          />
          <View
            pointerEvents="none"
            style={styles.mediaPrivacyOverlay}
            testID="notification-toast-privacy-overlay"
          />
        </>
      ) : isGasp ? (
        <View style={styles.mediaFallback} testID="notification-toast-media-fallback" />
      ) : actorAvatarUrl ? (
        <Image
          source={actorAvatarUrl}
          style={[styles.image, styles.avatarImage]}
          contentFit="cover"
          blurRadius={0}
          testID="notification-toast-visual"
        />
      ) : (
        <Text variant="caption" weight="600" style={styles.fallbackInitial}>
          {fallbackInitial}
        </Text>
      )}
      {isGasp && (
        <View pointerEvents="none" style={styles.privacyIcon}>
          <EyeOff size={20} color={colors.textPrimary} strokeWidth={2} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  solid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceElevated,
  },
  backgroundImage: { ...StyleSheet.absoluteFillObject, opacity: 0.28 },
  backgroundPrivacyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.58)',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: { width: 48, height: 48 },
  mediaPrivacyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.62)',
  },
  mediaFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  privacyIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarImage: { borderRadius: 24 },
  fallbackInitial: { color: colors.textPrimary },
});
