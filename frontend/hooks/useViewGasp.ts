import { useRef, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { CameraView } from 'expo-camera';
import { withTiming, type SharedValue } from 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';
import { useAuthStore } from '@/stores/authStore';
import { useCloseViewGasp, useCreateReaction } from '@/hooks/queries/useGasps';
import { uploadWithRetry, enqueueUpload, removeFromQueue } from '@/services/uploadQueue';
import { sendMessage as sendMessageREST } from '@/services/api/messages';
import { compressVideo } from '@/services/videoCompression';
import type { Gasp } from '@/services/api/schemas/gasp.schema';
import { useTranslation } from 'react-i18next';

const MAX_REACTION_DURATION_S = 30;
// After stopping expo-video, iOS needs ~2s for AVAudioSession to fully release
// before expo-camera can acquire it for recording.
const AVCAPTURE_SETTLE_MS = 2000;

// Backoff delays for sendMessage retries: immediate, 500ms, 1500ms
const SEND_RETRY_DELAYS_MS = [0, 500, 1500];

export function buildReactionMessagePayload(mediaUrl: string, replyToId?: string) {
  return {
    content: '[Reaction]',
    type: 'reaction' as const,
    mediaUrl,
    ...(replyToId && { replyToId }),
  };
}

interface UseViewGaspProps {
  gasp: Gasp | null;
  conversationId: string;
  messageId: string;
  holdDurationS: number;
  isRevealed: SharedValue<number>;
  startProgressAnimation: () => void;
  resetProgress: () => void;
  /** Called to stop the gasp video before recording starts — frees AVCapture session */
  onStopGaspVideo?: () => void;
  /** Remote CDN URL of the original gasp — retained for diagnostics */
  gaspUrl: string;
  resolveConversationId?: () => Promise<string | null>;
}

/** Private helper: sleep for ms milliseconds */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Encapsulates all recording, reveal, and reaction-send state for view-gasp.tsx.
 * Extracted to keep the screen component under 200 lines (CLAUDE.md Rule 3).
 */
export function useViewGasp({
  gasp,
  conversationId,
  messageId,
  holdDurationS,
  isRevealed,
  startProgressAnimation,
  resetProgress,
  onStopGaspVideo,
  gaspUrl,
  resolveConversationId,
}: UseViewGaspProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const closeViewMutation = useCloseViewGasp();
  const { mutateAsync: createReaction } = useCreateReaction();
  const currentGaspId = gasp?.id;
  const currentGaspSenderId = gasp?.senderId;

  const reactionCameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const releasedRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isMountedRef = useRef(true);
  const gaspIdRef = useRef<string | null>(null);
  const openedRef = useRef(false);
  const reactionSucceededRef = useRef(false);
  // Track background upload so we can cancel it on discard
  const bgUploadQueueIdRef = useRef<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      recordingPromiseRef.current = null;
      // Read latest refs on unmount so inbox-mode gasps close only when no reaction succeeded.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const id = gaspIdRef.current;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (id && openedRef.current && !reactionSucceededRef.current) {
        closeViewMutation.mutate(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Private helper: retry sendMessage via REST up to maxRetries times with backoff.
   *  Uses HTTP instead of socket to guarantee delivery even during reconnections.
   *  The same mediaUrl is preserved across all attempts (never mutated). */
  const sendMessageWithRetry = useCallback(
    async (
      convId: string,
      mediaUrl: string,
      replyToId: string,
      maxRetries: number,
    ) => {
      let lastError: unknown;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
          const delay = SEND_RETRY_DELAYS_MS[attempt] ?? SEND_RETRY_DELAYS_MS[SEND_RETRY_DELAYS_MS.length - 1];
          await sleep(delay);
        }
        try {
          await sendMessageREST(convId, buildReactionMessagePayload(mediaUrl, replyToId));
          return; // success
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    },
    [],
  );

  /** Private helper: show upload error toast */
  const showUploadErrorToast = useCallback(() => {
    Alert.alert(
      t('viewGasp.uploadFailedTitle'),
      t('viewGasp.uploadFailedBody'),
      [{ text: t('common.ok') }],
    );
  }, [t]);

  const showMissingConversationToast = useCallback(() => {
    Alert.alert(
      t('viewGasp.missingConversationTitle'),
      t('viewGasp.missingConversationBody'),
      [{ text: t('common.ok') }],
    );
  }, [t]);

  const handleHoldStart = useCallback(() => {
    releasedRef.current = false;
    setIsCountingDown(true);
  }, []);

  // Called when the 3-2-1 countdown finishes:
  // 1. Reveal the media (isRevealed → 1)
  // 2. Start the progress ring animation (gasp media duration)
  // 3. Start recording for exactly the gasp media duration (capped at MAX_REACTION_DURATION_S)
  const handleCountdownComplete = useCallback(() => {
    isRevealed.value = withTiming(1, { duration: 300 });
    startProgressAnimation();
    if (!reactionCameraRef.current) return;
    const reactionDurationS = Math.min(holdDurationS, MAX_REACTION_DURATION_S);

    // For image gasps: record immediately after settle delay (no AVCapture conflict).
    // For video gasps: stop video first, then record after a longer settle to
    // let AVAudioSession fully release before expo-camera takes it.
    const startRecording = () => {
      if (!reactionCameraRef.current || releasedRef.current) {
        isRecordingRef.current = false;
        setIsRecording(false);
        return;
      }
      try {
        isRecordingRef.current = true;
        setIsRecording(true);
        recordingPromiseRef.current = reactionCameraRef.current.recordAsync({
          maxDuration: reactionDurationS,
        });
        recordingPromiseRef.current?.catch((e) => {
          Sentry.captureException(e, { tags: { feature: 'reaction-recording' } });
          isRecordingRef.current = false;
          setIsRecording(false);
          recordingPromiseRef.current = null;
        });
      } catch (e) {
        Sentry.captureException(e, { tags: { feature: 'reaction-recording', step: 'start-recording' } });
        isRecordingRef.current = false;
        setIsRecording(false);
        recordingPromiseRef.current = null;
      }
    };

    // Stop gasp video immediately so VideoView unmounts and releases AVAudioSession.
    // Use a separate signal — NOT isRecording — to avoid remounting the reaction camera.
    onStopGaspVideo?.();
    setTimeout(startRecording, AVCAPTURE_SETTLE_MS);
  }, [isRevealed, startProgressAnimation, holdDurationS, onStopGaspVideo]);

  const handleRelease = useCallback(async () => {
    if (releasedRef.current) return;
    releasedRef.current = true;

    setIsCountingDown(false);

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
      videoUri = null;
    } finally {
      recordingPromiseRef.current = null;
    }

    if (!isMountedRef.current) return;

    if (videoUri) {
      // Start background upload immediately so it's ready when user taps Send
      const userId = user?.id ?? 'guest';
      enqueueUpload(videoUri, 'reactions', userId).then((queueId) => {
        bgUploadQueueIdRef.current = queueId;
      }).catch((e) => {
        Sentry.captureException(e, {
          tags: { feature: 'super-imposed-reaction', step: 'background-upload-enqueue' },
        });
      });
      setPreviewUri(videoUri);
    } else {
      // Recording returned no URI — camera likely wasn't ready.
      // Show an alert so the user knows what happened instead of silently closing.
      Alert.alert(
        t('viewGasp.recordingFailedTitle'),
        t('viewGasp.recordingFailedBody'),
        [{ text: t('common.ok'), onPress: () => router.back() }],
      );
    }
  }, [t, user]);

  /**
   * handleSend — composite flow (Requirement 2.2, 3.5, 4.1, 5.x, 8.x)
   *
   * Order:
   * 1. setIsSending(true) — disables Send button immediately
   * 2. uploadWithRetry → on failure: setIsSending(false), show toast, keep ReactionPreview visible
   * 3. removeFromQueue (bg upload no longer needed — CDN URL obtained)
   * 4. setPreviewUri(null) + router.back()
   * 5. sendMessageWithRetry with raw reactionVideoUrl + replyToId
   * 6. finally: setIsSending(false)
   */
  const handleSend = useCallback(() => {
    if (!previewUri || isSending) return;
    const localUri = previewUri;
    const userId = user?.id ?? 'guest';

    if (__DEV__) {
      console.tronLog?.log('handleSend | start', { localUri: localUri.slice(-40), userId, conversationId, messageId, gaspUrl: gaspUrl.slice(-40) });
    }

    setIsSending(true);
    // NOTE: router.back() is NOT called here — it fires after upload succeeds

    (async () => {
      try {
        const resolvedConversationId = conversationId || await resolveConversationId?.() || '';
        if (!resolvedConversationId) {
          Sentry.captureMessage('Reaction send blocked: missing conversationId', {
            tags: { feature: 'super-imposed-reaction', step: 'conversation-resolution' },
            extra: { gaspId: currentGaspId, senderId: currentGaspSenderId, messageId },
          });
          setIsSending(false);
          showMissingConversationToast();
          return;
        }

        // 1. Compress reaction video before upload to reduce size (~8MB → ~1MB)
        let uploadUri = localUri;
        try {
          uploadUri = await compressVideo(localUri);
          if (__DEV__) console.tronLog?.log('handleSend | compressed', { from: localUri.slice(-30), to: uploadUri.slice(-30) });
        } catch (e) {
          Sentry.captureException(e, {
            tags: { feature: 'super-imposed-reaction', step: 'compression' },
          });
          // compression failed — use original
          uploadUri = localUri;
        }

        // 2. Foreground upload (bg queue still active as safety net during upload)
        let reactionVideoUrl: string;
        try {
          const result = await uploadWithRetry(uploadUri, 'reactions', userId);
          if (!result.downloadUrl) {
            throw new Error('uploadWithRetry returned empty downloadUrl');
          }
          reactionVideoUrl = result.downloadUrl;
        } catch (e) {
          // Upload failed — keep ReactionPreview visible, re-enable Send button
          Sentry.captureException(e, {
            tags: { feature: 'super-imposed-reaction', step: 'upload' },
          });
          setIsSending(false);
          showUploadErrorToast();
          return;
        }

        // 2. Upload succeeded — cancel bg queue entry (CDN URL already obtained)
        if (bgUploadQueueIdRef.current) {
          await removeFromQueue(bgUploadQueueIdRef.current).catch((e) => {
            Sentry.captureException(e, {
              tags: { feature: 'super-imposed-reaction', step: 'background-upload-remove-after-send' },
            });
          });
          bgUploadQueueIdRef.current = null;
        }

        // 3. Navigate back immediately after upload, before composite job starts
        setPreviewUri(null);
        router.back();

        try {
          if (messageId) {
            await sendMessageWithRetry(resolvedConversationId, reactionVideoUrl, messageId, 3);
          } else if (currentGaspId) {
            await createReaction({
              gaspId: currentGaspId,
              videoUrl: reactionVideoUrl,
            });
          } else {
            await sendMessageREST(resolvedConversationId, buildReactionMessagePayload(reactionVideoUrl));
          }
          reactionSucceededRef.current = true;
        } catch (sendError: unknown) {
          Sentry.captureException(sendError, {
            tags: { feature: 'super-imposed-reaction', step: 'send-reaction-message' },
          });
        } finally {
          setIsSending(false);
        }
      } catch (e) {
        // Unexpected outer error
        Sentry.captureException(e, {
          tags: { feature: 'super-imposed-reaction', step: 'outer' },
        });
        setIsSending(false);
      }
    })();
  }, [
    previewUri,
    isSending,
    gaspUrl,
    conversationId,
    messageId,
    user,
    currentGaspId,
    currentGaspSenderId,
    createReaction,
    sendMessageWithRetry,
    showMissingConversationToast,
    showUploadErrorToast,
    resolveConversationId,
  ]);

  // Option A: full reset — user goes back through 3-2-1 for an authentic reaction
  const handleReRecord = useCallback(() => {
    setPreviewUri(null);
    isRevealed.value = withTiming(0, { duration: 200 });
    resetProgress();
    releasedRef.current = false;
  }, [isRevealed, resetProgress]);

  /**
   * handleDiscard — cancel everything in-flight (Requirement 6.x)
   *
   * Order: router.back() → removeFromQueue → closeViewMutation (inbox only)
   */
  const handleDiscard = useCallback(() => {
    router.back();                                              // immediate, non-blocking
    if (bgUploadQueueIdRef.current) {
      removeFromQueue(bgUploadQueueIdRef.current).catch((e) => {
        Sentry.captureException(e, {
          tags: { feature: 'super-imposed-reaction', step: 'background-upload-remove-discard' },
        });
      });
      bgUploadQueueIdRef.current = null;
    }
    const id = gaspIdRef.current;
    if (id) closeViewMutation.mutate(id);                      // inbox mode only
  }, [closeViewMutation]);

  return {
    reactionCameraRef,
    gaspIdRef,
    openedRef,
    isCountingDown,
    isRecording,
    previewUri,
    isSending,
    /** Actual reaction recording duration in seconds (= gasp duration capped at 30s) */
    reactionDurationS: Math.min(holdDurationS, MAX_REACTION_DURATION_S),
    handleHoldStart,
    handleCountdownComplete,
    handleRelease,
    handleSend,
    handleReRecord,
    handleDiscard,
    MAX_REACTION_DURATION_S,
  };
}
