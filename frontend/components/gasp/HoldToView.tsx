import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';import { useState } from 'react';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Sentry from '@sentry/react-native';
import { Text } from '@/components/ui/Text';
import { parseTextOverlay, TextOverlayRenderer } from './TextOverlayRenderer';
import { GaspTimer } from './GaspTimer';
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { getCachedUri } from '@/services/mediaCache';
import type { GaspMediaType } from '@/services/api/schemas/gasp.schema';



interface HoldToViewProps {
  imageUri: string;
  mediaType?: GaspMediaType;
  blurhash?: string;
  senderName: string;
  textOverlayJson?: string;
  isHolding: SharedValue<number>;
  holdProgress: SharedValue<number>;
  isRevealed: SharedValue<number>;
  onVideoLoad?: (durationMs: number) => void;
  /** When true, mutes/pauses the video player to free AVCapture for reaction recording */
  isRecording?: boolean;
  /** Callback ref — call to stop video and free AVCapture session */
  onStopVideoRef?: React.MutableRefObject<(() => void) | null>;
}

export function HoldToView({
  imageUri,
  mediaType = 'image',
  blurhash,
  senderName,
  textOverlayJson,
  isHolding,
  holdProgress,
  isRevealed,
  onVideoLoad,
  isRecording = false,
  onStopVideoRef,
}: HoldToViewProps) {
  const isVideo = mediaType === 'video';
  const textOverlay = textOverlayJson ? parseTextOverlay(textOverlayJson) : null;
  // Use cached local path if available, otherwise use the URI as-is
  // (openGaspViewer already downloads to local cache before navigating)
  const resolvedUri = imageUri.startsWith('file://') ? imageUri : (getCachedUri(imageUri) ?? imageUri);
  // Pass a dummy silent URI for non-video to avoid "shared object released" crash
  const videoPlayer = useVideoPlayer(isVideo ? resolvedUri : 'about:blank', (p) => {
    p.loop = false;
    p.playbackRate = 1.0;
    // Don't auto-play — controlled by hold gesture
  });

  // Report video duration to parent when player is ready.
  // On iPhone 16/17, duration may be 0 at readyToPlay — poll until it's populated.
  useEffect(() => {
    if (!isVideo || !onVideoLoad) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    const reportDuration = (durationS: number) => {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      if (fallbackTimeout) { clearTimeout(fallbackTimeout); fallbackTimeout = null; }
      onVideoLoad(Math.ceil(durationS * 1000));
    };

    const tryReport = () => {
      if (videoPlayer.duration > 0) {
        reportDuration(videoPlayer.duration);
        return true;
      }
      return false;
    };

    const handleReady = () => {
      if (!tryReport()) {
        // Duration not yet populated — poll every 100ms up to 2s
        pollInterval = setInterval(() => { tryReport(); }, 100);
        // Fallback: unblock gesture after 2s with 10s default
        fallbackTimeout = setTimeout(() => {
          if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
          onVideoLoad(10_000);
        }, 2000);
      }
    };

    const sub = videoPlayer.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'readyToPlay') handleReady();
    });
    if (videoPlayer.status === 'readyToPlay') handleReady();

    return () => {
      sub.remove();
      if (pollInterval) clearInterval(pollInterval);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [isVideo, videoPlayer, onVideoLoad]);

  const startVideo = useCallback(() => {
    if (!isVideo) return;
    try {
      videoPlayer.currentTime = 0;
      videoPlayer.play();
    } catch (e) {
      Sentry.captureException(e, { extra: { context: 'HoldToView.startVideo' } });
    }
  }, [videoPlayer, isVideo]);

  // Expose stop function via ref so parent can stop video before recording starts
  const [isVideoStopped, setIsVideoStopped] = useState(false);
  useEffect(() => {
    if (onStopVideoRef) {
      onStopVideoRef.current = () => {
        try { videoPlayer.pause(); } catch {}
        setIsVideoStopped(true);
      };
    }
    return () => {
      if (onStopVideoRef) onStopVideoRef.current = null;
    };
  }, [videoPlayer, onStopVideoRef]);

  // Pause video during reaction recording to free AVCapture session
  useEffect(() => {
    if (!isVideo) return;
    if (isRecording) {
      try { videoPlayer.pause(); } catch {}
    } else {
      // Resume only if revealed
      if (isRevealed.get() === 1) {
        try { videoPlayer.play(); } catch {}
      }
    }
  }, [isRecording, isVideo, videoPlayer, isRevealed]);

  const pauseVideo = useCallback(() => {
    if (!isVideo) return;
    try {
      videoPlayer.pause();
    } catch (e) {
      Sentry.captureException(e, { extra: { context: 'HoldToView.pauseVideo' } });
    }
  }, [videoPlayer, isVideo]);

  useAnimatedReaction(
    () => isRevealed.get(),
    (current, previous) => {
      if (current === 1 && previous !== 1) {
        runOnJS(startVideo)();
      } else if (current === 0 && previous !== 0) {
        runOnJS(pauseVideo)();
      }
    },
  );

  // Media opacity: fade in when isRevealed transitions to 1
  const imageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(isRevealed.get(), [0, 1], [0, 1]),
  }));

  // Instruction overlay: hide as soon as user starts holding (isHolding),
  // so the countdown is visible without the "HOLD TO VIEW" text in the way
  const instructionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(isHolding.get(), [0, 1], [1, 0]),
    transform: [
      { scale: interpolate(isHolding.get(), [0, 1], [1, 0.9]) },
    ],
  }));

  // Ring timer: visible once revealed (recording in progress)
  const timerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(isRevealed.get(), [0, 1], [0, 1]),
  }));

  return (
    <View style={styles.container}>
      {/* Blurred preview (always visible) */}
      {isVideo ? (
        <>
          <Image
            placeholder={blurhash ? { blurhash } : undefined}
            style={styles.blurredImage}
            contentFit="cover"
          />
          <View style={styles.blurOverlay} />
        </>
      ) : (
        <>
          <Image
            source={{ uri: resolvedUri }}
            placeholder={blurhash ? { blurhash } : undefined}
            style={styles.blurredImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            blurRadius={80}
          />
          {/* Extra dark overlay to fully obscure content */}
          <View style={styles.blurOverlay} />
        </>
      )}

      {/* Revealed media (visible on hold) */}
      <Animated.View style={[styles.revealedContainer, imageStyle]}>
        {isVideo && videoPlayer && !isVideoStopped ? (
          <VideoView
            player={videoPlayer}
            style={styles.revealedImage}
            contentFit="contain"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{ uri: resolvedUri }}
            style={styles.revealedImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />
        )}
        {textOverlay && <TextOverlayRenderer data={textOverlay} />}
      </Animated.View>

      {/* Hold instruction overlay */}
      <Animated.View style={[styles.instructionOverlay, instructionStyle]}>
        <GaspTimer progress={holdProgress} size={100} strokeWidth={3} />
        <Text variant="subtitle" style={styles.senderName}>
          {senderName}
        </Text>
        <Text variant="caption" style={styles.instruction}>
          {'TAP TO VIEW'}
        </Text>
      </Animated.View>

      {/* Timer during hold */}
      <Animated.View style={[styles.timerContainer, timerStyle]}>
        <GaspTimer progress={holdProgress} size={60} strokeWidth={3} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blurredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  revealedContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  revealedImage: {
    ...StyleSheet.absoluteFillObject,
  },
  instructionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    gap: 16,
  },
  senderName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instruction: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 3,
  },
  timerContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});
