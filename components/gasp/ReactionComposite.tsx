import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PrivateImage as ExpoImage } from '@/components/ui/PrivateImage';
import { VideoView } from 'expo-video';
import { usePrivateVideoPlayer as useVideoPlayer } from '@/hooks/usePrivateVideoPlayer';
import { InlineVideo } from '@/components/ui/InlineVideo';
import { Text } from '@/components/ui/Text';

export const REACTION_WATERMARK = { right: 0.03333, bottom: 0.01875, width: 0.08889 } as const;

const WATERMARK_SOURCE = require('@/assets/images/gasp-watermark-white.png');

export interface ReactionCompositeProps {
  originalUri: string;
  originalMediaType?: 'image' | 'video';
  reactionVideoUri: string;
  reactionLabel?: string;
  originalLabel?: string;
  showLabels?: boolean;
  showDivider?: boolean;
  dividerStyle?: StyleProp<ViewStyle>;
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
  dividerStyle,
  watermarkMode = 'hidden',
  reactionPaused = false,
  reactionMuted = false,
  reactionFlex = 50,
  originalFlex = 50,
}: ReactionCompositeProps) {
  return (
    <View testID="reaction-composite" style={styles.container}>
      {/* Original gasp — top half */}
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

      {showDivider && <View pointerEvents="none" testID="reaction-composite-divider" style={[styles.divider, dividerStyle]} />}

      {/* Reaction video — bottom half */}
      <View testID="reaction-composite-reaction-panel" style={[styles.reactionPanel, { flex: reactionFlex }]}>
        <InlineVideo
          uri={reactionVideoUri}
          style={StyleSheet.absoluteFill}
          paused={reactionPaused}
          muted={reactionMuted}
        />
        {showLabels && reactionLabel && <PanelLabel label={reactionLabel} />}
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
    flexDirection: 'column',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  reactionPanel: {
    overflow: 'hidden',
  },
  divider: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
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
    right: `${REACTION_WATERMARK.right * 100}%`,
    bottom: `${REACTION_WATERMARK.bottom * 100}%`,
    width: `${REACTION_WATERMARK.width * 100}%`,
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
