import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, Alert, ActivityIndicator } from 'react-native';
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
import { findPendingGasp, findPendingGaspByMedia } from '@/hooks/queries/useGasps.helpers';
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
  const pendingQuery = usePendingGasps();
  const pendingGasps = pendingQuery.data ?? [];
  const openGaspMutation = useOpenGasp();
  const getOrCreateConversationMutation = useGetOrCreateConversation();

  // Never fall back to another pending gasp: a notification for gasp A must
  // not open gasp B (and consume it) when A is missing from the list.
  // A gasp opened from the chat is the same server gasp as in the Gasps tab
  // (same media URL); linking them keeps both views and the server in sync.
  const gasp = findPendingGasp(pendingGasps, params.gaspId)
    ?? findPendingGaspByMedia(pendingGasps, params.chatGaspUrl);
  // On a cold start from a push the pending list may still be loading.
  const isResolvingGasp = !!params.gaspId && !params.chatImageUri && !pendingQuery.isFetched;

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
  const resolveConversationId = useCallback(async () => {
    if (conversationId) return conversationId;
    if (!gasp?.senderId) return null;
    const conversation = await getOrCreateConversationMutation.mutateAsync(gasp.senderId);
    return conversation.id;
  }, [conversationId, gasp?.senderId, getOrCreateConversationMutation]);

  // The gasp is consumed (chat bubble marked viewed, inbox gasp opened on the
  // server) only once the media is actually revealed — never on screen mount,
  // so a failed or abandoned attempt keeps the gasp available.
  const revealRef = useRef<() => void>(() => {});
  const handleReveal = useCallback(() => {
    revealRef.current();
    setRevealTick((n) => n + 1);
  }, []);

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
    handleCameraReady,
    handleCountdownComplete,
    handleRelease,
    handleSend,
    handleDiscard,
  } = useViewGasp({
    gasp,
    conversationId,
    messageId,
    holdDurationS: Math.ceil((holdDuration ?? 10_000) / 1000),
    isRevealed,
    startProgressAnimation: stableStartProgress,
    resetProgress: stableResetProgress,
    gaspUrl,
    resolveConversationId,
    onReveal: handleReveal,
  });

  const hasRevealedRef = useRef(false);
  useEffect(() => {
    revealRef.current = () => {
      hasRevealedRef.current = true;
      if (messageId && imageUri) {
        useGaspStore.getState().markChatGaspViewed(messageId, imageUri);
      }
      const mediaUrl = params.chatGaspUrl || gasp?.imageUrl;
      if (mediaUrl) useGaspStore.getState().markGaspMediaViewed(mediaUrl);
    };
  }, [messageId, imageUri, gasp, params.chatGaspUrl]);

  // Tell the server once the media was revealed. Also covers a chat gasp
  // whose server record resolves after the reveal (pending list still
  // loading), so the server never keeps a gasp the viewer already saw.
  const [revealTick, setRevealTick] = useState(0);
  useEffect(() => {
    if (hasRevealedRef.current && gasp && !openedRef.current) {
      openedRef.current = true;
      gaspIdRef.current = gasp.id;
      openGaspMutation.mutate(gasp.id);
    }
  }, [gasp, revealTick, openGaspMutation, openedRef, gaspIdRef]);

  const { gesture, isHolding, holdProgress, touchX, touchY, startProgressAnimation, resetProgress } =
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
    if (imageUri || isResolvingGasp) return;
    if (params.gaspId) {
      Alert.alert(t('viewGasp.unavailableTitle'), t('viewGasp.unavailableBody'));
    }
    router.back();
  }, [imageUri, isResolvingGasp, params.gaspId, t]);

  if (!imageUri) {
    return isResolvingGasp ? (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    ) : null;
  }

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.container}>
        <HoldToView imageUri={imageUri} mediaType={mediaType} blurhash={blurhash}
          senderName={senderName} isHolding={isHolding} holdProgress={holdProgress}
          isRevealed={isRevealed} touchX={touchX} touchY={touchY} />
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
            touchX={touchX} touchY={touchY} onVideoLoad={handleVideoLoad} />
        </View>
      </GestureDetector>
      <ReactionCapture isActive={isCameraNeeded}
        isVisible={!!(cameraPermission?.granted && micPermission?.granted)}
        isRecording={isRecording} maxDurationS={reactionDurationS}
        cameraRef={reactionCameraRef} onCameraReady={handleCameraReady} />
      <RecordingCountdown isActive={isCountingDown} onCountdownComplete={handleCountdownComplete}
        touchX={touchX} touchY={touchY} />
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
            senderName={senderName} onSend={handleSend}
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
  centered: { justifyContent: 'center', alignItems: 'center' },
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
