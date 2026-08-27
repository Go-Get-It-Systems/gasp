import { useRef, useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { CameraView, useMicrophonePermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react-native';
import { useCameraStore } from '@/stores/cameraStore';

const RECORD_RETRY_DELAY_MS = 2000;

interface StartRecordingOptions {
  /** Called before the retry attempt — return false to abort if the user has already released. */
  shouldRetry?: () => boolean;
}

export function useCamera() {
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const { facing, flashMode, toggleFacing: storeToggleFacing, cycleFlash, setCapturedUri, setRecording } =
    useCameraStore();
  const [zoom, setZoom] = useState(0);

  // Reset zoom when switching cameras (front/back have different ranges)
  const toggleFacing = useCallback(() => {
    setZoom(0);
    storeToggleFacing();
  }, [storeToggleFacing]);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return null;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        return photo.uri;
      }
      return null;
    } catch (error) {
      console.error('Failed to take picture:', error);
      return null;
    }
  }, [setCapturedUri]);

  const startRecording = useCallback(async (
    options?: StartRecordingOptions,
  ): Promise<string | null> => {
    if (!cameraRef.current) {
      return null;
    }

    // Ensure microphone permission before recording
    if (!micPermission?.granted) {
      const { granted } = await requestMicPermission();
      if (!granted) {
        Alert.alert(
          t('camera.microphoneRequiredTitle'),
          t('camera.microphoneRequiredBody'),
        );
        return null;
      }
    }

    const tryRecord = async (): Promise<string | null> => {
      if (!cameraRef.current) return null;
      const video = await cameraRef.current.recordAsync({ maxDuration: 10 });
      if (video?.uri) {
        setCapturedUri(video.uri);
        return video.uri;
      }
      return null;
    };

    setRecording(true);
    try {
      return await tryRecord();
    } catch (firstError) {
      // recordAsync can throw if AVCaptureSession is still reconfiguring after a
      // mode change (picture -> video). Wait for the session to settle and retry once.
      Sentry.captureException(firstError, {
        tags: { feature: 'camera-record', phase: 'first-attempt' },
      });
      await new Promise((resolve) => setTimeout(resolve, RECORD_RETRY_DELAY_MS));
      // Bail if the caller signals the user already released the longpress —
      // otherwise we'd record a "ghost" video without intent.
      if (options?.shouldRetry && !options.shouldRetry()) {
        return null;
      }
      try {
        return await tryRecord();
      } catch (secondError) {
        Sentry.captureException(secondError, {
          tags: { feature: 'camera-record', phase: 'retry' },
        });
        Alert.alert(
          t('camera.recordingFailedTitle'),
          t('camera.recordingFailedBody'),
        );
        return null;
      }
    } finally {
      setRecording(false);
    }
  }, [micPermission, requestMicPermission, setCapturedUri, setRecording, t]);

  const stopRecording = useCallback(() => {
    if (!cameraRef.current) return;
    cameraRef.current.stopRecording();
  }, []);

  return {
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
  };
}
