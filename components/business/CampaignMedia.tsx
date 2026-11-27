import { PrivateImage as Image } from '@/components/ui/PrivateImage';
import { VideoView } from 'expo-video';
import { usePrivateVideoPlayer as useVideoPlayer } from '@/hooks/usePrivateVideoPlayer';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { businessStyles } from './BusinessUI';

type Props = { uri: string; mediaType: 'image' | 'video'; naturalSize?: boolean };
const ratioOf = (size?: { width: number; height: number }) =>
  size && size.width > 0 && size.height > 0 ? size.width / size.height : undefined;

function CampaignVideo({ uri, naturalSize }: Omit<Props, 'mediaType'>) {
  const focused = useIsFocused();
  const [ratio, setRatio] = useState(4 / 3);
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  useEffect(() => { if (!focused) player.pause(); }, [focused, player]);
  useEffect(() => {
    if (!naturalSize) return;
    const update = (size?: { width: number; height: number }) => { const next = ratioOf(size); if (next) setRatio(next); };
    update(player.videoTrack?.size ?? player.availableVideoTracks[0]?.size);
    const loaded = player.addListener('sourceLoad', ({ availableVideoTracks }) => update(availableVideoTracks[0]?.size));
    const changed = player.addListener('videoTrackChange', ({ videoTrack }) => update(videoTrack?.size));
    return () => { loaded.remove(); changed.remove(); };
  }, [naturalSize, player]);
  return <VideoView player={player} style={naturalSize ? { width: '100%', aspectRatio: ratio } : businessStyles.media} nativeControls contentFit="contain" />;
}
function CampaignImage({ uri, naturalSize }: Omit<Props, 'mediaType'>) {
  const { t } = useTranslation();
  const [ratio, setRatio] = useState(4 / 3);
  return <Image source={{ uri }} style={naturalSize ? { width: '100%', aspectRatio: ratio } : businessStyles.media}
    onLoad={({ source }) => { const next = ratioOf(source); if (next) setRatio(next); }}
    contentFit="contain" accessibilityRole="image" accessibilityLabel={t('business.mediaPreview')} />;
}
export function CampaignMedia({ uri, mediaType, naturalSize }: Props) {
  return <View style={naturalSize ? { marginHorizontal: -20 } : undefined}>
    {mediaType === 'video' ? <CampaignVideo key={uri} uri={uri} naturalSize={naturalSize} />
      : <CampaignImage key={uri} uri={uri} naturalSize={naturalSize} />}
  </View>;
}
