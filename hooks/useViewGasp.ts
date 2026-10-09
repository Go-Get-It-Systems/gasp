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
import { resolveReactionMediaUrl } from '@/services/compositeService';
import type { Gasp } from '@/services/api/schemas/gasp.schema';
import { useTranslation } from 'react-i18next';

const MAX_REACTION_DURATION_S = 30;
// Recording starts as soon as the front camera is ready during the 3-2-1
// countdown, so the clip also covers the countdown before the reveal.
const COUNTDOWN_S = 3;
// Slack so recordAsync's own maxDuration never cuts the clip before the
// progress ring ends the hold.
const RECORDING_SLACK_S = 1;

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
  /** Remote CDN URL of the original gasp — retained for diagnostics */
  gaspUrl: string;
  /** Called once when the media is actually revealed — the only point where the gasp is consumed */
  onReveal?: () => void;
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
  gaspUrl,
  resolveConversationId,
  onReveal,
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
  const revealedRef = useRef(false);
  // Timestamps that let the server composite line the gasp up with the face:
  // the clip starts during the countdown, before the reveal.
  const recordingStartedAtRef = useRef<number | null>(null);
  const revealedAtRef = useRef<number | null>(null);
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

  const reactionDurationS = Math.min(holdDurationS, MAX_REACTION_DURATION_S);

  const startRecording = useCallback(() => {
    const camera = reactionCameraRef.current;
    if (!camera || releasedRef.current || isRecordingRef.current) return;
    try {
      isRecordingRef.current = true;
      setIsRecording(true);
      recordingStartedAtRef.current = Date.now();
      recordingPromiseRef.current = camera.recordAsync({
        maxDuration: reactionDurationS + COUNTDOWN_S + RECORDING_SLACK_S,
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
  }, [reactionDurationS]);

  const handleHoldStart = useCallback(() => {
    releasedRef.current = false;
    setIsCountingDown(true);
  }, []);

  // The front camera mounts when the hold starts; begin recording as soon as it
  // is ready so the reveal itself is captured (previously recording only began
  // ~2s after the reveal and missed the reaction's first moments).
  const handleCameraReady = useCallback(() => {
    if (!releasedRef.current) startRecording();
  }, [startRecording]);

  // Called when the 3-2-1 countdown finishes: reveal the media, start the
  // progress ring for the gasp duration, and start recording if the camera
  // was not ready in time during the countdown.
  const handleCountdownComplete = useCallback(() => {
    if (releasedRef.current) return;
    revealedRef.current = true;
    revealedAtRef.current = Date.now();
    isRevealed.value = withTiming(1, { duration: 300 });
    startProgressAnimation();
    onReveal?.();
    startRecording();
  }, [isRevealed, startProgressAnimation, onReveal, startRecording]);

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

    // Released during the 3-2-1 countdown: nothing was revealed, so the gasp is
    // still unopened. Reset quietly so the viewer can hold again.
    if (!revealedRef.current) {
      resetProgress();
      return;
    }

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
  }, [t, user, resetProgress]);

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

        // 3. Navigate back right after the upload; compositing continues in the background
        setPreviewUri(null);
        router.back();

        // 4. Ask the server for the side-by-side composite (falls back to the
        //    raw reaction), so the sender sees what the reaction was about.
        const startedAt = recordingStartedAtRef.current;
        const revealedAt = revealedAtRef.current;
        const revealOffsetMs = startedAt !== null && revealedAt !== null
          ? Math.max(0, revealedAt - startedAt)
          : undefined;
        const reactionMediaUrl = await resolveReactionMediaUrl(reactionVideoUrl, gaspUrl, revealOffsetMs);

        try {
          if (messageId) {
            await sendMessageWithRetry(resolvedConversationId, reactionMediaUrl, messageId, 3);
          } else if (currentGaspId) {
            await createReaction({
              gaspId: currentGaspId,
              videoUrl: reactionMediaUrl,
            });
          } else {
            await sendMessageREST(resolvedConversationId, buildReactionMessagePayload(reactionMediaUrl));
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
    /** Reaction recording duration in seconds (= gasp duration capped at 30s, plus the countdown) */
    reactionDurationS: reactionDurationS + COUNTDOWN_S,
    handleHoldStart,
    handleCameraReady,
    handleCountdownComplete,
    handleRelease,
    handleSend,
    handleDiscard,
    MAX_REACTION_DURATION_S,
  };
}
