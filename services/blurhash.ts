import { Image } from 'expo-image';
import * as Sentry from '@sentry/react-native';

/**
 * Small blurhash for a local image, used for privacy-safe previews of the
 * gasp (Open now card, latest moment, notification art) without exposing
 * the media itself. Best effort: a failure only means a gradient fallback.
 */
export async function generatePreviewBlurhash(localImageUri: string): Promise<string | undefined> {
  try {
    const hash = await Image.generateBlurhashAsync(localImageUri, [4, 3]);
    return hash ?? undefined;
  } catch (e) {
    Sentry.captureException(e, { tags: { feature: 'gasp-preview', step: 'blurhash' } });
    return undefined;
  }
}
