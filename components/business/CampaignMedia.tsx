import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { businessStyles } from './BusinessUI';

function CampaignVideo({ uri }: { uri: string }) {
  const focused = useIsFocused();
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  useEffect(() => { if (!focused) player.pause(); }, [focused, player]);
  return <VideoView player={player} style={businessStyles.media} nativeControls contentFit="contain" />;
}
export function CampaignMedia({ uri, mediaType }: { uri: string; mediaType: 'image' | 'video' }) {
  const { t } = useTranslation();
  return mediaType === 'video' ? <CampaignVideo uri={uri} /> : <Image source={{ uri }} style={businessStyles.media} contentFit="contain" accessibilityRole="image" accessibilityLabel={t('business.mediaPreview')} />;
}
