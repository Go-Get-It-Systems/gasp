import { StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { InlineVideo } from '@/components/ui/InlineVideo';
import { Text } from '@/components/ui/Text';

const WATERMARK_SOURCE = require('@/assets/images/gasp-watermark-white.png');

export interface ReactionCompositeProps {
  originalUri: string;
  originalMediaType?: 'image' | 'video';
  reactionVideoUri: string;
  reactionLabel?: string;
  originalLabel?: string;
  showLabels?: boolean;
  showDivider?: boolean;
  watermarkMode?: 'hidden' | 'subtle';
  reactionPaused?: boolean;
  reactionMuted?: boolean;
  reactionFlex?: number;
  originalFlex?: number;
  // captureRef and forCapture intentionally removed — composition is server-side
}

function OriginalMedia({
  uri,
  mediaType,
  style,
}: {
  uri: string;
  mediaType: 'image' | 'video';
  style: object;
}) {
  const player = useVideoPlayer(mediaType === 'video' ? uri : 'about:blank', (p) => {
    p.loop = true;
    p.muted = true;
    if (mediaType === 'video') p.play();
  });

  if (mediaType === 'video') {
    return (
      <VideoView
        player={player}
        style={style}
        contentFit="cover"
        nativeControls={false}
      />
    );
  }
  return <ExpoImage source={{ uri }} style={style} contentFit="cover" />;
}

export function ReactionComposite({
  originalUri,
  originalMediaType = 'image',
  reactionVideoUri,
  reactionLabel,
  originalLabel,
  showLabels = false,
  showDivider = true,
  watermarkMode = 'hidden',
  reactionPaused = false,
  reactionMuted = false,
  reactionFlex = 45,
  originalFlex = 55,
}: ReactionCompositeProps) {
  return (
    <View style={styles.container}>
      {/* Reaction video — left 45% */}
      <View testID="reaction-composite-reaction-panel" style={[styles.reactionPanel, { flex: reactionFlex }]}>
        <InlineVideo
          uri={reactionVideoUri}
          style={StyleSheet.absoluteFill}
          paused={reactionPaused}
          muted={reactionMuted}
        />
        {showLabels && reactionLabel && <PanelLabel label={reactionLabel} />}
      </View>

      {showDivider && <View testID="reaction-composite-divider" style={styles.divider} />}

      {/* Original gasp — right 55% */}
      <View testID="reaction-composite-gasp-panel" style={[styles.gaspPanel, { flex: originalFlex }]}>
        <OriginalMedia
          uri={originalUri}
          mediaType={originalMediaType}
          style={StyleSheet.absoluteFill}
        />
        {showLabels && originalLabel && <PanelLabel label={originalLabel} />}
        {watermarkMode === 'subtle' && (
          <View
            testID="reaction-composite-watermark"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.watermark}
          >
            <ExpoImage
              source={WATERMARK_SOURCE}
              contentFit="contain"
              style={[styles.watermarkImage, styles.watermarkShadow]}
            />
            <ExpoImage
              source={WATERMARK_SOURCE}
              contentFit="contain"
              style={styles.watermarkImage}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function PanelLabel({ label }: { label: string }) {
  return (
    <View style={styles.labelPill}>
      <Text variant="caption" numberOfLines={1} style={styles.labelText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  reactionPanel: {
    overflow: 'hidden',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.28)',
    zIndex: 2,
  },
  gaspPanel: {
    overflow: 'hidden',
  },
  labelPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  watermark: {
    position: 'absolute',
    right: '3.333%',
    bottom: '1.875%',
    width: '8.889%',
    aspectRatio: 1,
    zIndex: 3,
  },
  watermarkImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  watermarkShadow: {
    tintColor: '#000000',
    opacity: 0.35,
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
});
