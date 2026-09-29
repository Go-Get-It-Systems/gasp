import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

/**
 * Compress an image before upload: resize to max 1080px width and convert to WebP.
 * Reduces file size by ~80% compared to raw camera output.
 *
 * Falls back to the original URI if compression fails for any reason.
 */
export async function compressImage(uri: string): Promise<string> {
  try {
    const originalFile = new File(uri);
    const originalSize = originalFile.exists ? originalFile.size : 0;

    const result = await manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: SaveFormat.WEBP },
    );

    const compressedFile = new File(result.uri);
    const compressedSize = compressedFile.exists ? compressedFile.size : 0;

    if (originalSize > 0 && compressedSize > 0) {
      const originalKB = (originalSize / 1024).toFixed(1);
      const compressedKB = (compressedSize / 1024).toFixed(1);
      const savings = ((1 - compressedSize / originalSize) * 100).toFixed(0);
      console.log(
        `[imageCompression] ${originalKB}KB → ${compressedKB}KB (${savings}% smaller)`,
      );
    }

    return result.uri;
  } catch (error) {
    console.warn('[imageCompression] Failed to compress, using original:', error);
    return uri;
  }
}
