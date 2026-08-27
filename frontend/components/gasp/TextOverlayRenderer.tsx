import { StyleSheet, View, Dimensions } from 'react-native';
import { Text } from '@/components/ui/Text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TextPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface TextOverlayData {
  text: string;
  font: 'modern' | 'classic' | 'bold' | 'mono';
  color: string;
  bgMode: 'none' | 'dark' | 'light';
  align: 'left' | 'center' | 'right';
  fontSize?: number;
  pos?: TextPosition;
  mediaType?: 'image' | 'video';
}

const FONT_MAP: Record<string, { fontFamily?: string; fontWeight: '400' | '700' | '900' }> = {
  modern: { fontWeight: '700' },
  classic: { fontFamily: 'serif', fontWeight: '400' },
  bold: { fontWeight: '900' },
  mono: { fontFamily: 'monospace', fontWeight: '400' },
};

/** Parse text overlay JSON from message content. Returns null if not a text overlay. */
export function parseTextOverlay(content: string): TextOverlayData | null {
  if (!content.startsWith('{')) return null;
  try {
    const data = JSON.parse(content);
    if (data.text && data.font) return data as TextOverlayData;
    return null;
  } catch {
    return null;
  }
}

interface TextOverlayRendererProps {
  data: TextOverlayData;
  /** Scale factor for smaller views (e.g., chat thumbnails) */
  scale?: number;
}

export function TextOverlayRenderer({ data, scale = 1 }: TextOverlayRendererProps) {
  const fontStyle = FONT_MAP[data.font] ?? FONT_MAP.modern!;
  const textColor = data.bgMode === 'light' ? '#FFFFFF' : data.color;
  const fontSize = (data.fontSize ?? 28) * scale;
  const pos = data.pos;

  const bgBase = {
    paddingHorizontal: 16 * scale,
    paddingVertical: 8 * scale,
    borderRadius: 8 * scale,
  };

  const positionTransform = pos
    ? {
        transform: [
          { translateX: pos.x * (SCREEN_WIDTH / 2) * scale },
          { translateY: pos.y * (SCREEN_HEIGHT / 2) * scale },
          { scale: pos.scale },
          { rotate: `${pos.rotation}rad` },
        ] as const,
      }
    : undefined;

  return (
    <View style={styles.container} pointerEvents="none">
      <View
        style={[
          styles.wrapper,
          data.bgMode === 'dark' && [bgBase, { backgroundColor: 'rgba(0,0,0,0.65)' }],
          data.bgMode === 'light' && [bgBase, { backgroundColor: data.color }],
          positionTransform,
        ]}
      >
        <Text
          variant="body"
          style={[
            {
              fontSize,
              lineHeight: fontSize * 1.3,
              color: textColor,
              fontWeight: fontStyle.fontWeight,
              fontFamily: fontStyle.fontFamily,
              textAlign: data.align,
            },
            data.bgMode === 'none' && styles.dropShadow,
          ]}
        >
          {data.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  wrapper: {
    maxWidth: '85%',
  },
  dropShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
});
