import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraControls } from './CameraControls';
import { CaptureButton } from './CaptureButton';
import { RecentThumbnail } from './RecentThumbnail';
import { EffectsButton } from './EffectsButton';
import { EffectsPanel } from './EffectsPanel';

const MAX_RECORD_DURATION_S = 10;

interface CameraOverlayProps {
  flashMode: 'off' | 'on' | 'auto';
  lastCapturedUri: string | null;
  isRecording?: boolean;
  showEffectsPanel?: boolean;
  timerDuration?: 0 | 3 | 10;
  showGrid?: boolean;
  onToggleFlash: () => void;
  onFlipCamera: () => void;
  onCapture: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  onOpenGallery?: () => void;
  onToggleEffects?: () => void;
  onCycleTimer?: () => void;
  onToggleGrid?: () => void;
}

export function CameraOverlay({
  flashMode,
  lastCapturedUri,
  onToggleFlash,
  onFlipCamera,
  onCapture,
  isRecording = false,
  showEffectsPanel = false,
  timerDuration = 0,
  showGrid = false,
  onLongPressStart,
  onLongPressEnd,
  onOpenGallery,
  onToggleEffects,
  onCycleTimer,
  onToggleGrid,
}: CameraOverlayProps) {
  const insets = useSafeAreaInsets();

  // Animated progress bar — fills from 0 to 1 over MAX_RECORD_DURATION_S while recording
  const progress = useSharedValue(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [remainingS, setRemainingS] = useState(MAX_RECORD_DURATION_S);

  useEffect(() => {
    if (isRecording) {
      setRemainingS(MAX_RECORD_DURATION_S);
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: MAX_RECORD_DURATION_S * 1000,
        easing: Easing.linear,
      });
      intervalRef.current = setInterval(() => {
        setRemainingS((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      progress.value = withTiming(0, { duration: 200 });
      setRemainingS(MAX_RECORD_DURATION_S);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording, progress]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Recording progress bar — shown at top during recording */}
      {isRecording && (
        <View style={[styles.progressTrack, { top: insets.top + 8 }]}>
          <Animated.View style={[styles.progressFill, progressBarStyle]} />
        </View>
      )}

      {/* Top gradient fade — hidden while recording */}
      {!isRecording && (
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={[styles.topGradient, { paddingTop: insets.top }]}
        >
          <CameraControls
            flashMode={flashMode}
            onToggleFlash={onToggleFlash}
            onFlipCamera={onFlipCamera}
          />
        </LinearGradient>
      )}

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Bottom gradient fade + controls */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={[styles.bottomGradient, { paddingBottom: insets.bottom + 90 }]}
      >
        {/* Effects panel (slides up above controls) */}
        {showEffectsPanel && !isRecording && onCycleTimer && onToggleGrid && (
          <EffectsPanel
            timerDuration={timerDuration}
            showGrid={showGrid}
            onCycleTimer={onCycleTimer}
            onToggleGrid={onToggleGrid}
          />
        )}

        <View style={[styles.bottomControls, isRecording && styles.bottomControlsRecording]}>
          {!isRecording && <RecentThumbnail uri={lastCapturedUri} onPress={onOpenGallery} />}
          <CaptureButton
            onCapture={onCapture}
            onLongPressStart={onLongPressStart}
            onLongPressEnd={onLongPressEnd}
            isRecording={isRecording}
          />
          {!isRecording && <EffectsButton onPress={onToggleEffects} isActive={showEffectsPanel} />}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingBottom: 24,
  },
  spacer: {
    flex: 1,
  },
  bottomGradient: {
    paddingTop: 40,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  bottomControlsRecording: {
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 2,
  },
});
