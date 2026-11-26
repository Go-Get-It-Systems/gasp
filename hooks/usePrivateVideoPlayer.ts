import { useVideoPlayer, type VideoSource, type VideoPlayer } from 'expo-video';
import { useAuthorizedMediaUri } from './useAuthorizedMediaUri';
import { isPrivateMediaUrl } from '@/services/privateMedia';

export function usePrivateVideoPlayer(source: VideoSource, setup?: (player: VideoPlayer) => void) {
  const original = typeof source === 'string' ? source
    : source && typeof source === 'object' ? source.uri : undefined;
  const uri = useAuthorizedMediaUri(original);
  const resolved = isPrivateMediaUrl(original)
    ? uri ? (typeof source === 'object' ? { ...source, uri, useCaching: false } : { uri, useCaching: false }) : null
    : source;
  return useVideoPlayer(resolved, setup);
}
