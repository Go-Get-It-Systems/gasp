import { Image, type ImageProps } from 'expo-image';
import { useAuthorizedMediaUri } from '@/hooks/useAuthorizedMediaUri';
import { isPrivateMediaUrl } from '@/services/privateMedia';

/** Handles local assets and public avatars normally; private objects need a grant. */
export function PrivateImage({ source, cachePolicy, ...props }: ImageProps) {
  const original = typeof source === 'string' ? source
    : source && !Array.isArray(source) && typeof source === 'object' && 'uri' in source ? source.uri : undefined;
  const uri = useAuthorizedMediaUri(original);
  const privateMedia = isPrivateMediaUrl(original);
  const sensitiveSource = privateMedia || original?.startsWith('file://');
  const resolved = privateMedia ? (uri ? (typeof source === 'object' ? { ...source, uri } : uri) : null) : source;
  return <Image {...props} source={resolved} cachePolicy={sensitiveSource ? 'none' : cachePolicy} />;
}
