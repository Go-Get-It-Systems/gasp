/**
 * Campaign Reaction Viewer
 *
 * Provides the same split-screen reaction experience as view-gasp.tsx but for
 * business campaigns. The user sees the campaign media on the right and their
 * front camera on the left (PiP). They hold to record and then send the
 * reaction to the campaign via submitCampaignReaction.
 *
 * Params:
 *   mediaUri       — campaign media URL
 *   isVideo        — 'true' if video
 *   workspaceId    — business workspace ID
 *   campaignId     — campaign ID
 *   campaignTitle  — campaign title (shown in ReactionPreview)
 */
import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HoldToView } from '@/components/gasp/HoldToView';
import { ReactionCapture } from '@/components/gasp/ReactionCapture';
import { ReactionPreview } from '@/components/gasp/ReactionPreview';
import { RecordingCountdown } from '@/components/gasp/RecordingCountdown';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { useHoldGesture } from '@/hooks/useHoldGesture';
import { markCampaignDelivery, submitCampaignReaction } from '@/services/api/business';
import { uploadWithRetry } from '@/services/uploadQueue';
import { compressVideo } from '@/services/videoCompression';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';

const MAX_DURATION_S = 30;
const AVCAPTURE_SETTLE_MS = 2000;

export default function CampaignReactionViewer() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { mediaUri, isVideo, workspaceId, campaignId, campaignTitle } =
    useLocalSearchParams<{
      mediaUri: string;
      isVideo?: string;
      workspaceId: string;
      campaignId: string;
      campaignTitle: string;
    }>();

  const isVideoMode = isVideo === 'true';
  const mediaType: 'image' | 'video' = isVideoMode ? 'video' : 'image';

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const reactionCameraRef = useRef<any>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const releasedRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isMountedRef = useRef(true);

  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const isCameraNeeded = useSharedValue(0);
  const isRevealed = useSharedValue(0);
  const startProgressRef = useRef<() => void>(() => {});
  const resetProgressRef = useRef<() => void>(() => {});
  const stopVideoRef = useRef<(() => void) | null>(null);

  const stableStartProgress = useCallback(() => startProgressRef.current(), []);
  const stableResetProgress = useCallback(() => resetProgressRef.current(), []);
  const stableStopVideo = useCallback(() => stopVideoRef.current?.(), []);

  const HOLD_DURATION_MS = 10_000; // 10s for image campaigns

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Signal main camera to release AVCapture
  useEffect(() => {
    useAppStore.getState().setViewingGasp(true);
    return () => useAppStore.getState().setViewingGasp(false);
  }, []);

  const handleHoldStart = useCallback(() => {
    releasedRef.current = false;
    setIsCountingDown(true);
  }, []);

  const handleCountdownComplete = useCallback(() => {
    isRevealed.value = withTiming(1, { duration: 300 });
    stableStartProgress();
    stableStopVideo();

    setTimeout(() => {
      if (!reactionCameraRef.current || releasedRef.current) return;
      try {
        isRecordingRef.current = true;
        setIsRecording(true);
        recordingPromiseRef.current = reactionCameraRef.current.recordAsync({
          maxDuration: MAX_DURATION_S,
        });
        recordingPromiseRef.current?.catch((e: any) => {
          Sentry.captureException(e);
          isRecordingRef.current = false;
          setIsRecording(false);
        });
      } catch (e) {
        Sentry.captureException(e);
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    }, AVCAPTURE_SETTLE_MS);
  }, [isRevealed, stableStartProgress, stableStopVideo]);

  const handleRelease = useCallback(async () => {
    if (releasedRef.current) return;
    releasedRef.current = true;
    setIsCountingDown(false);
    console.log('[Viewer] handleRelease called, isRecording:', isRecordingRef.current);

    let videoUri: string | null = null;
    try {
      if (reactionCameraRef.current && isRecordingRef.current) {
        reactionCameraRef.current.stopRecording();
        isRecordingRef.current = false;
        setIsRecording(false);
      }
      if (recordingPromiseRef.current) {
        const result = await recordingPromiseRef.current;
        videoUri = result?.uri ?? null;
      }
    } catch (e) {
      Sentry.captureException(e);
    } finally {
      recordingPromiseRef.current = null;
    }

    if (!isMountedRef.current) return;

    if (videoUri) {
      console.log('[Viewer] videoUri ready:', videoUri?.slice(0, 60));
      setPreviewUri(videoUri);
    } else {
      console.log('[Viewer] no videoUri captured');
      Alert.alert('Recording failed', 'Could not capture your reaction. Please try again.', [
        { text: 'OK', onPress: () => router.dismiss() },
      ]);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!previewUri || isSending) return;
    const localUri = previewUri;
    const userId = user?.id ?? 'guest';

    console.log('[Viewer] handleSend START workspaceId:', workspaceId, 'campaignId:', campaignId, 'userId:', userId);

    setIsSending(true);

    (async () => {
      try {
        // Compress
        let uploadUri = localUri;
        try {
          uploadUri = await compressVideo(localUri);
        } catch {
          uploadUri = localUri;
        }

        // Upload
        console.log('[Viewer] uploading reaction video...');
        const result = await uploadWithRetry(uploadUri, 'reactions', userId);
        console.log('[Viewer] upload done, downloadUrl:', result.downloadUrl?.slice(0, 60));
        if (!result.downloadUrl) throw new Error('Upload returned no URL');

        // Submit reaction to campaign
        console.log('[Viewer] calling submitCampaignReaction workspaceId:', workspaceId);
        await submitCampaignReaction(workspaceId, {
          campaignId,
          videoUrl: result.downloadUrl,
        });
        console.log('[Viewer] reaction submitted OK');

        // Mark delivery as viewed (reacting = strongest engagement signal)
        markCampaignDelivery(workspaceId, campaignId, 'viewed').catch(() => {});

        // Mark as stale so they refetch when business-profile/studio regains focus.
        // Only invalidate if workspaceId is a valid non-empty string.
        if (workspaceId) {
          queryClient.invalidateQueries({ queryKey: ['businesses', 'handle'], refetchType: 'none' });
          queryClient.invalidateQueries({ queryKey: ['businesses', workspaceId, 'reactions'], refetchType: 'none' });
          queryClient.invalidateQueries({ queryKey: ['businesses', workspaceId, 'pinned-reactions'], refetchType: 'none' });
          queryClient.invalidateQueries({ queryKey: ['businesses', workspaceId, 'overview'], refetchType: 'none' });
        }

        setPreviewUri(null);
        Alert.alert('Reaction sent!', `Your reaction to "${campaignTitle}" has been submitted.`, [
          { text: 'Done', onPress: () => router.dismiss() },
        ]);
      } catch (e: any) {
        Sentry.captureException(e);
        const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to send reaction.';
        Alert.alert('Error', msg);
      } finally {
        setIsSending(false);
      }
    })();
  }, [previewUri, isSending, workspaceId, campaignId, campaignTitle, user]);

  const handleReRecord = useCallback(() => {
    setPreviewUri(null);
    isRevealed.value = withTiming(0, { duration: 200 });
    stableResetProgress();
    releasedRef.current = false;
  }, [isRevealed, stableResetProgress]);

  const handleDiscard = useCallback(() => { router.dismiss(); }, []);

  const { gesture, isHolding, holdProgress, startProgressAnimation, resetProgress } =
    useHoldGesture({
      onHoldStart: useCallback(() => {
        isCameraNeeded.value = 1;
        handleHoldStart();
      }, [isCameraNeeded, handleHoldStart]),
      onHoldComplete: useCallback(async () => {
        await handleRelease();
        isCameraNeeded.value = 0;
      }, [isCameraNeeded, handleRelease]),
      onHoldEnd: useCallback(async () => {
        await handleRelease();
        isCameraNeeded.value = 0;
      }, [isCameraNeeded, handleRelease]),
      duration: HOLD_DURATION_MS,
    });

  useEffect(() => {
    startProgressRef.current = startProgressAnimation;
    resetProgressRef.current = resetProgress;
  }, [startProgressAnimation, resetProgress]);

  const handleGrantAccess = useCallback(async () => {
    await requestCameraPermission();
    await requestMicPermission();
  }, [requestCameraPermission, requestMicPermission]);

  if (!mediaUri) {
    router.dismiss();
    return null;
  }

  // Permission gate
  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.container}>
        <HoldToView imageUri={mediaUri} mediaType={mediaType} senderName={campaignTitle ?? ''}
          isHolding={isHolding} holdProgress={holdProgress} isRevealed={isRevealed} />
        <View style={styles.permOverlay}>
          <View style={styles.permCard}>
            <Text style={styles.permTitle}>Camera & Mic Required</Text>
            <Text style={styles.permBody}>
              GASP needs your front camera and microphone to capture your reaction.
            </Text>
            <Pressable onPress={handleGrantAccess} style={styles.permBtn} accessibilityRole="button">
              <Text style={styles.permBtnText}>Grant Access</Text>
            </Pressable>
          </View>
        </View>
        <Pressable onPress={() => router.dismiss()} style={[styles.closeBtn, { top: insets.top + 12 }]}>
          <X size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <View style={styles.gestureArea}>
          <HoldToView
            imageUri={mediaUri}
            mediaType={mediaType}
            senderName={campaignTitle ?? 'Campaign'}
            isHolding={isHolding}
            holdProgress={holdProgress}
            isRevealed={isRevealed}
            isRecording={isRecording}
            onStopVideoRef={stopVideoRef}
          />
        </View>
      </GestureDetector>

      <ReactionCapture
        isActive={isCameraNeeded}
        isVisible={!!(cameraPermission?.granted && micPermission?.granted)}
        isRecording={isRecording}
        maxDurationS={MAX_DURATION_S}
        cameraRef={reactionCameraRef}
      />

      <RecordingCountdown isActive={isCountingDown} onCountdownComplete={handleCountdownComplete} />

      <Pressable
        onPress={() => router.dismiss()}
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <X size={24} color="#FFFFFF" />
      </Pressable>

      {previewUri !== null && (
        <View style={styles.previewOverlay}>
          <ReactionPreview
            originalImageUri={mediaUri}
            originalMediaType={mediaType}
            reactionVideoUri={previewUri}
            senderName={campaignTitle ?? 'Campaign'}
            onSend={handleSend}
            onReRecord={handleReRecord}
            onDiscard={handleDiscard}
            isSending={isSending}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  gestureArea: { flex: 1 },
  closeBtn: {
    position: 'absolute', right: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  previewOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  // Permission gate
  permOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, zIndex: 5,
  },
  permCard: {
    backgroundColor: colors.surface, borderRadius: 24, borderCurve: 'continuous',
    padding: 32, alignItems: 'center', gap: 12, width: '100%',
  },
  permTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  permBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    marginTop: 8, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 28, borderCurve: 'continuous',
    backgroundColor: colors.primary, width: '100%', alignItems: 'center',
  },
  permBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
