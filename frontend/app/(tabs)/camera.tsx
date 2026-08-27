import { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator, Linking } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { CameraOverlay } from '@/components/camera/CameraOverlay';
import { GridOverlay } from '@/components/camera/GridOverlay';
import { TimerCountdown } from '@/components/camera/TimerCountdown';
import { useCamera } from '@/hooks/useCamera';
import { useCameraStore } from '@/stores/cameraStore';
import { useAppStore } from '@/stores/appStore';
import { calculateZoomFromPinch } from '@/hooks/cameraZoom';
import { colors } from '@/constants/colors';
import { CameraOff } from 'lucide-react-native';
import { openCameraPreview } from '@/services/navigation';

const CAMERA_MODE_SWITCH_DELAY = 600;

export default function CameraScreen() {
  const isFocused = useIsFocused();
  const isViewingGasp = useAppStore((s) => s.isViewingGasp);
  const isCameraActive = isFocused && !isViewingGasp;
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');
  const recordingIntentRef = useRef(false);
  const modeSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const {
    cameraRef,
    facing,
    flashMode,
    zoom,
    setZoom,
    toggleFacing,
    cycleFlash,
    takePicture,
    startRecording,
    stopRecording,
  } = useCamera();

  // Pinch-to-zoom gesture (zoom is React state for CameraView prop; baseZoom on SharedValue for worklets)
  const baseZoomSV = useSharedValue(0);
  const applyZoom = useCallback((value: number) => setZoom(value), [setZoom]);
  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      baseZoomSV.value = zoom;
    })
    .onUpdate((e) => {
      'worklet';
      const next = calculateZoomFromPinch(baseZoomSV.value, e.scale);
      runOnJS(applyZoom)(next);
    });

  useEffect(() => {
    return () => {
      if (modeSwitchTimeoutRef.current) {
        clearTimeout(modeSwitchTimeoutRef.current);
      }
    };
  }, []);

  const lastCapturedUri = useCameraStore((s) => s.lastCapturedUri);
  const isRecording = useCameraStore((s) => s.isRecording);
  const timerDuration = useCameraStore((s) => s.timerDuration);
  const showGrid = useCameraStore((s) => s.showGrid);
  const cycleTimer = useCameraStore((s) => s.cycleTimer);
  const toggleGrid = useCameraStore((s) => s.toggleGrid);

  const doCapture = useCallback(async () => {
    setIsProcessing(true);
    try {
      const uri = await takePicture();
      if (uri) {
        openCameraPreview({ imageUri: uri });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [takePicture]);

  const handleTimerComplete = useCallback(() => {
    setIsCountingDown(false);
    doCapture();
  }, [doCapture]);

  const handleCapture = async () => {
    if (useCameraStore.getState().isRecording) return;

    const timer = useCameraStore.getState().timerDuration;
    if (timer > 0) {
      setShowEffectsPanel(false);
      setIsCountingDown(true);
      return;
    }

    await doCapture();
  };

  const handleRecordStart = () => {
    if (modeSwitchTimeoutRef.current) {
      clearTimeout(modeSwitchTimeoutRef.current);
    }
    recordingIntentRef.current = true;
    setCameraMode('video');
    modeSwitchTimeoutRef.current = setTimeout(() => {
      if (!recordingIntentRef.current) {
        setCameraMode('picture');
        return;
      }
      startRecording({
        shouldRetry: () => recordingIntentRef.current,
      }).then((uri) => {
        setCameraMode('picture');
        if (uri) {
          openCameraPreview({ imageUri: uri, isVideo: true });
        }
      });
    }, CAMERA_MODE_SWITCH_DELAY);
  };

  const handleRecordStop = () => {
    recordingIntentRef.current = false;
    stopRecording();
  };

  const handleOpenGallery = async () => {
    setIsLoadingGallery(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        videoMaxDuration: 10,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        openCameraPreview({ imageUri: asset.uri, isVideo: asset.type === 'video', fromGallery: true });
      }
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleGrantAccess = async () => {
    if (permission?.canAskAgain === false) {
      Linking.openSettings();
      return;
    }
    await requestPermission();
    await requestMicPermission();
  };

  // Permission not granted yet
  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <CameraOff size={48} color={colors.textSecondary} />
        <Text variant="title" style={styles.permissionTitle}>
          {'Camera Access'}
        </Text>
        <Text variant="body" style={styles.permissionText}>
          {'GASP needs camera and microphone access to capture moments and reactions'}
        </Text>
        <Pressable onPress={handleGrantAccess} style={styles.permissionButton}>
          <Text variant="body" style={styles.permissionButtonText}>
            {permission?.canAskAgain === false ? 'Open Settings' : 'Grant Access'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Only render camera when tab is focused and no modal is open */}
      {isCameraActive ? (
        <GestureDetector gesture={pinchGesture}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            flash={flashMode}
            enableTorch={flashMode === 'on'}
            mode={cameraMode}
            zoom={zoom}
          />
        </GestureDetector>
      ) : (
        <View style={styles.cameraPlaceholder} />
      )}

      {/* Grid overlay */}
      {showGrid && <GridOverlay />}

      {/* Timer countdown */}
      {isCountingDown && (
        <TimerCountdown seconds={timerDuration} onComplete={handleTimerComplete} />
      )}

      {/* Processing overlay (capture/record → preview transition) */}
      {isProcessing && (
        <View style={styles.galleryLoading}>
          <View style={styles.galleryLoadingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="caption" style={styles.galleryLoadingText}>Processing...</Text>
          </View>
        </View>
      )}

      {/* Gallery loading overlay */}
      {isLoadingGallery && (
        <View style={styles.galleryLoading}>
          <View style={styles.galleryLoadingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="caption" style={styles.galleryLoadingText}>Preparing...</Text>
          </View>
        </View>
      )}

      {/* Camera overlay with controls */}
      <CameraOverlay
        flashMode={flashMode}
        lastCapturedUri={lastCapturedUri}
        isRecording={isRecording}
        showEffectsPanel={showEffectsPanel}
        timerDuration={timerDuration}
        showGrid={showGrid}
        onToggleFlash={cycleFlash}
        onFlipCamera={toggleFacing}
        onCapture={handleCapture}
        onLongPressStart={handleRecordStart}
        onLongPressEnd={handleRecordStop}
        onOpenGallery={handleOpenGallery}
        onToggleEffects={() => setShowEffectsPanel((p) => !p)}
        onCycleTimer={cycleTimer}
        onToggleGrid={toggleGrid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  permissionText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  galleryLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  galleryLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  galleryLoadingText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
