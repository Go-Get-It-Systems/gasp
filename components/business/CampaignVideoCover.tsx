import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { createVideoPlayer, type VideoThumbnail } from 'expo-video';
import { Play } from 'lucide-react-native';
import { useAuthorizedMediaUri } from '@/hooks/useAuthorizedMediaUri';
import { useAuthStore } from '@/stores/authStore';
import { getSessionGeneration } from '@/services/session';
import { colors } from '@/constants/colors';

/** A still frame only: no autoplay, audio, or persistent private-media cache. */
export function CampaignVideoCover({ uri }: { uri: string }) {
  const authorizedUri = useAuthorizedMediaUri(uri);
  const actor = useAuthStore(state => state.user?.id);
  const generation = getSessionGeneration();
  const key = `${generation}:${actor ?? ''}:${uri}`;
  const [cover, setCover] = useState<{ key: string; image: VideoThumbnail } | null>(null);

  useEffect(() => {
    if (!authorizedUri || !actor || Platform.OS === 'web' || cover?.key === key) return;
    const player = createVideoPlayer(null);
    player.muted = true;
    player.audioMixingMode = 'mixWithOthers';
    let active = true;
    let released = false;
    const release = () => { if (!released) { released = true; player.release(); } };
    void (async () => {
      try {
        await player.replaceAsync({ uri: authorizedUri, useCaching: false });
        if (!active) return;
        const time = player.duration > 0 ? Math.min(1, player.duration / 2) : 0;
        // iOS expects an array even though the SDK's TS signature also allows a number.
        const [image] = await player.generateThumbnailsAsync([time], { maxWidth: 640, maxHeight: 640 });
        if (active && generation === getSessionGeneration() && image) setCover({ key, image });
      } catch {
        // Keep the tile navigable if the network or native frame extraction fails.
        if (active) setCover(null);
      } finally { release(); }
    })();
    return () => { active = false; release(); };
  }, [authorizedUri, actor, generation, key, cover?.key]);

  const image = authorizedUri && actor && cover?.key === key ? cover.image : null;
  return <View style={styles.container} pointerEvents="none" accessible={false}>
    {image && <Image testID="campaign-video-cover" source={image} style={StyleSheet.absoluteFill}
      contentFit="cover" cachePolicy="none" recyclingKey={key} />}
    <View style={styles.play}><Play size={18} color="#FFF" fill="#FFF" /></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  play: { position: 'absolute', top: 12, left: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
});
