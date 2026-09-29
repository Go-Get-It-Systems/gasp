import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIXEL_RATIO = PixelRatio.get();

/**
 * Get optimized image dimensions for the current screen density
 */
export function getOptimizedSize(displayWidth: number, displayHeight: number) {
  return {
    width: Math.round(displayWidth * PIXEL_RATIO),
    height: Math.round(displayHeight * PIXEL_RATIO),
  };
}

/**
 * Build a thumbnail URL with size parameters
 */
export function getThumbnailUrl(
  baseUrl: string,
  width: number,
  height: number
): string {
  const optimized = getOptimizedSize(width, height);
  return `${baseUrl}?w=${optimized.width}&h=${optimized.height}&fit=cover`;
}

/**
 * Get screen-width image URL
 */
export function getFullWidthUrl(baseUrl: string): string {
  const width = Math.round(SCREEN_WIDTH * PIXEL_RATIO);
  return `${baseUrl}?w=${width}&fit=cover`;
}
