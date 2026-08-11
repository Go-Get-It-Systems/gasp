import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useSharedValue } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { X, Camera, Flag } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { HoldToView } from '@/components/gasp/HoldToView';
import { ReactionCapture } from '@/components/gasp/ReactionCapture';
import { ReactionPreview } from '@/components/gasp/ReactionPreview';
import { RecordingCountdown } from '@/components/gasp/RecordingCountdown';
import { Text } from '@/components/ui/Text';
import { useHoldGesture } from '@/hooks/useHoldGesture';
import { useViewGasp } from '@/hooks/useViewGasp';
import { useGaspStore } from '@/stores/gaspStore';
import { useAppStore } from '@/stores/appStore';
import { useOpenGasp, usePendingGasps } from '@/hooks/queries/useGasps';
import { useGetOrCreateConversation } from '@/hooks/queries/useChat';
import { colors } from '@/constants/colors';
import { ReportSheet } from '@/components/safety/ReportSheet';

export default function ViewGaspScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [reportVisible, setReportVisible] = useState(false);
  const params = useLocalSearchParams<{
    gaspId?: string;
    chatImageUri?: string;
    chatSenderName?: string;
    chatMediaType?: string;
    chatBlurhash?: string;
    chatConversationId?: string;
    chatMessageId?: string;
    chatTextOverlay?: string;
    /** Remote CDN URL of the original gasp — used for composite payload */
    chatGaspUrl?: string;
  }>();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const { data: pendingGasps = [] } = usePendingGasps();
  const openGaspMutation = useOpenGasp();
  const getOrCreateConversationMutation = useGetOrCreateConversation();

  const gasp = params.gaspId
    ? pendingGasps.find((g) => g.id === params.gaspId) ?? pendingGasps[0]
    : null;

  const imageUri = params.chatImageUri || gasp?.imageUri;
  const senderName = params.chatSenderName || gasp?.senderName || '';
  const mediaType = (params.chatMediaType as 'image' | 'video') || gasp?.mediaType || 'image';
  const blurhash = params.chatBlurhash || gasp?.blurhash;
  const conversationId = params.chatConversationId || '';
  const messageId = params.chatMessageId || '';
  // CDN URL for composite payload — chatGaspUrl takes priority, then gasp.imageUrl, fallback to local URI
  const gaspUrl = params.chatGaspUrl || gasp?.imageUrl || imageUri || '';

  // Image gasps: 10s fixed. Video gasps: actual video duration (set by onVideoLoad).
  // Both capped at MAX_REACTION_DURATION_S (30s) inside useViewGasp.
  const IMAGE_VIEW_DURATION = 10_000;
  const [holdDuration, setHoldDuration] = useState(
    mediaType === 'video' ? null : IMAGE_VIEW_DURATION,
  );
  // B1: block the hold gesture until video duration is confirmed — prevents the
  // race where iPhone 16/17 reports duration late and we default to 10s.
  const isDurationReady = mediaType !== 'video' || holdDuration !== null;
  const handleVideoLoad = useCallback((durationMs: number) => {
    if (durationMs > 0) setHoldDuration(durationMs);
  }, []);

  // isCameraNeeded: 1 from the moment user starts holding until recording finishes.
  // Keeps CameraView mounted through hold → countdown → recording → release.
  const isCameraNeeded = useSharedValue(0);

  // Owned here so it can be passed to both useViewGasp and HoldToView.
  // 0 = hidden (blurred), 1 = revealed. Set to 1 after countdown, reset on re-record.
  const isRevealed = useSharedValue(0);

  // Stable refs so useViewGasp can call startProgressAnimation/resetProgress
  // that are only defined after useHoldGesture runs below.
  const startProgressRef = useRef<() => void>(() => {});
  const resetProgressRef = useRef<() => void>(() => {});
  const stableStartProgress = useCallback(() => startProgressRef.current(), []);
  const stableResetProgress = useCallback(() => resetProgressRef.current(), []);
  const stopVideoRef = useRef<(() => void) | null>(null);
  const stableStopVideo = useCallback(() => stopVideoRef.current?.(), []);
  const resolveConversationId = useCallback(async () => {
    if (conversationId) return conversationId;
    if (!gasp?.senderId) return null;
    const conversation = await getOrCreateConversationMutation.mutateAsync(gasp.senderId);
    return conversation.id;
  }, [conversationId, gasp?.senderId, getOrCreateConversationMutation]);

  const {
    reactionCameraRef,
    gaspIdRef,
    openedRef,
    isCountingDown,
    isRecording,
    previewUri,
    isSending,
    reactionDurationS,
    handleHoldStart,
    handleCountdownComplete,
    handleRelease,
    handleSend,
    handleReRecord,
    handleDiscard,
  } = useViewGasp({
    gasp,
    conversationId,
    messageId,
    holdDurationS: Math.ceil((holdDuration ?? 10_000) / 1000),
    isRevealed,
    startProgressAnimation: stableStartProgress,
    resetProgress: stableResetProgress,
    onStopGaspVideo: stableStopVideo,
    gaspUrl,
    resolveConversationId,
  });

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
      duration: holdDuration ?? 10_000,
    });

  // Keep stable refs pointing at the live implementations.
  useEffect(() => {
    startProgressRef.current = startProgressAnimation;
    resetProgressRef.current = resetProgress;
  }, [startProgressAnimation, resetProgress]);

  // Mark chat gasp viewed locally (UI only)
  useEffect(() => {
    if (messageId && imageUri) {
      useGaspStore.getState().markChatGaspViewed(messageId, imageUri);
    }
  }, [messageId, imageUri]);

  // Open gasp on mount (inbox-mode only)
  useEffect(() => {
    if (gasp && !openedRef.current) {
      openedRef.current = true;
      gaspIdRef.current = gasp.id;
      openGaspMutation.mutate(gasp.id);
    }
  }, [gasp, openGaspMutation, openedRef, gaspIdRef]);

  const handleClose = useCallback(() => { router.back(); }, []);

  // Signal main camera to release AVCapture session while this screen is open
  useEffect(() => {
    useAppStore.getState().setViewingGasp(true);
    return () => useAppStore.getState().setViewingGasp(false);
  }, []);

  const handleGrantReactionAccess = useCallback(async () => {
    await requestCameraPermission();
    await requestMicPermission();
  }, [requestCameraPermission, requestMicPermission]);

  useEffect(() => {
    if (!imageUri) router.back();
  }, [imageUri]);

  if (!imageUri) return null;

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.container}>
        <HoldToView imageUri={imageUri} mediaType={mediaType} blurhash={blurhash}
          senderName={senderName} isHolding={isHolding} holdProgress={holdProgress}
          isRevealed={isRevealed} />
        <View style={styles.permissionOverlay}>
          <View style={styles.permissionCard}>
            <Camera size={40} color={colors.primary} />
            <Text variant="subtitle" style={styles.permissionTitle}>{'Camera & Microphone Required'}</Text>
            <Text variant="body" style={styles.permissionText}>{'GASP needs your front camera and microphone to capture your reaction while viewing'}</Text>
            <Pressable onPress={handleGrantReactionAccess} accessibilityRole="button"
              accessibilityLabel="Grant camera and microphone access" style={styles.permissionButton}>
              <Text variant="body" style={styles.permissionButtonText}>{'Grant Access'}</Text>
            </Pressable>
          </View>
        </View>
        <Pressable onPress={handleClose} accessibilityRole="button"
          accessibilityLabel="Close gasp viewer" style={[styles.closeButton, { top: insets.top + 12 }]}>
          <X size={24} color="#FFFFFF" />
        </Pressable>
        {gasp?.id ? <Pressable onPress={() => setReportVisible(true)} accessibilityRole="button" accessibilityLabel={t('safety.report.title')} style={[styles.reportButton, { top: insets.top + 12 }]}>
          <Flag size={20} color="#FFFFFF" />
        </Pressable> : null}
        {gasp?.id ? <ReportSheet visible={reportVisible} targetType="gasp" targetId={gasp.id} onClose={() => setReportVisible(false)} onSubmitted={() => {
          setReportVisible(false);
          Alert.alert(t('safety.report.receivedTitle'), t('safety.report.receivedBody'));
        }} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={isDurationReady ? gesture : Gesture.Manual()}>
        <View style={styles.gestureArea}>
          <HoldToView imageUri={imageUri} mediaType={mediaType} blurhash={blurhash}
            senderName={senderName} textOverlayJson={params.chatTextOverlay}
            isHolding={isHolding} holdProgress={holdProgress} isRevealed={isRevealed}
            isRecording={isRecording} onStopVideoRef={stopVideoRef}
            onVideoLoad={handleVideoLoad} />
        </View>
      </GestureDetector>
      <ReactionCapture isActive={isCameraNeeded}
        isVisible={!!(cameraPermission?.granted && micPermission?.granted)}
        isRecording={isRecording} maxDurationS={reactionDurationS}
        cameraRef={reactionCameraRef} />
      <RecordingCountdown isActive={isCountingDown} onCountdownComplete={handleCountdownComplete} />
      <Pressable onPress={handleClose} accessibilityRole="button"
        accessibilityLabel="Close gasp viewer" style={[styles.closeButton, { top: insets.top + 12 }]}>
        <X size={24} color="#FFFFFF" />
      </Pressable>
      {gasp?.id ? <Pressable onPress={() => setReportVisible(true)} accessibilityRole="button" accessibilityLabel={t('safety.report.title')} style={[styles.reportButton, { top: insets.top + 12 }]}>
        <Flag size={20} color="#FFFFFF" />
      </Pressable> : null}
      {previewUri !== null && (
        <View style={styles.previewOverlay}>
          <ReactionPreview originalImageUri={imageUri} originalMediaType={mediaType} reactionVideoUri={previewUri}
            senderName={senderName} onSend={handleSend} onReRecord={handleReRecord}
            onDiscard={handleDiscard} isSending={isSending} />
        </View>
      )}
      {gasp?.id ? <ReportSheet visible={reportVisible} targetType="gasp" targetId={gasp.id} onClose={() => setReportVisible(false)} onSubmitted={() => {
        setReportVisible(false);
        Alert.alert(t('safety.report.receivedTitle'), t('safety.report.receivedBody'));
      }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  gestureArea: { flex: 1 },
  closeButton: {
    position: 'absolute', right: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  reportButton: {
    position: 'absolute', right: 70, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  previewOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  permissionOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, zIndex: 5,
  },
  permissionCard: {
    backgroundColor: colors.surface, borderRadius: 24, borderCurve: 'continuous',
    padding: 32, alignItems: 'center', gap: 12, width: '100%',
  },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  permissionText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  permissionButton: {
    marginTop: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28,
    borderCurve: 'continuous', backgroundColor: colors.primary, width: '100%', alignItems: 'center',
  },
  permissionButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
