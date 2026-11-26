import { useEffect } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import { Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { campaignComposerStyles as styles } from './campaignComposerStyles';

export function CampaignComposerMedia({ media, disabled, onPress }: {
  media?: { uri: string; mediaType: 'image' | 'video' }; disabled: boolean; onPress: () => void;
}) {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const isVideo = media?.mediaType === 'video';
  const player = useVideoPlayer(isVideo ? media.uri : null, (video) => { video.loop = true; video.muted = true; });
  useEffect(() => { if (focused && isVideo) player.play(); else player.pause(); }, [focused, isVideo, player]);

  return <Pressable style={styles.mediaPicker} onPress={onPress} disabled={disabled}
    accessibilityRole="button" accessibilityLabel={t('business.chooseMedia')} accessibilityState={{ disabled }}>
    {media ? (isVideo ? <VideoView player={player} style={styles.mediaPreview} contentFit="cover" nativeControls={false} />
      : <Image source={{ uri: media.uri }} style={styles.mediaPreview} resizeMode="cover"
        accessibilityRole="image" accessibilityLabel={t('business.mediaPreview')} />)
      : <View style={styles.mediaPlaceholder}>
        <Video size={40} color={colors.textTertiary} />
        <Text style={styles.mediaPlaceholderText}>{t('business.tapChooseMedia')}</Text>
        <Text style={styles.mediaPlaceholderHint}>{t('business.fromCameraRoll')}</Text>
      </View>}
    {media && !disabled && <View style={styles.changeOverlay}>
      <Text style={styles.changeOverlayText}>{t('business.tapChangeMedia')}</Text>
    </View>}
  </Pressable>;
}
