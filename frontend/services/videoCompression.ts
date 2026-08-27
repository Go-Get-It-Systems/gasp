import { Video } from 'react-native-compressor';

export async function compressVideo(uri: string): Promise<string> {
  try {
    const compressedUri = await Video.compress(uri, {
      compressionMethod: 'auto',
      maxSize: 720,
    });
    return compressedUri;
  } catch (error) {
    console.warn('[videoCompression] Failed to compress, using original:', error);
    return uri;
  }
}
