/**
 * useViewGasp Tests
 *
 * Verifies the recording/reveal state machine for the gasp viewer screen.
 * Actual camera recording and Reanimated animations run on native threads
 * and cannot be fully unit tested — these tests cover JS-thread state transitions.
 */

import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import type { CameraView } from 'expo-camera';
import type { SharedValue } from 'react-native-reanimated';
import { useViewGasp } from '@/hooks/useViewGasp';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const values: Record<string, string> = {
        'common.ok': 'OK',
        'viewGasp.recordingFailedTitle': 'Recording failed',
        'viewGasp.recordingFailedBody': 'Could not capture your reaction. Please try again.',
        'viewGasp.uploadFailedTitle': 'Upload failed',
        'viewGasp.uploadFailedBody': 'Could not upload your reaction. Please try again.',
        'viewGasp.missingConversationTitle': 'Could not send reaction',
        'viewGasp.missingConversationBody': 'We could not find the chat for this gasp. Please try again from the conversation.',
        'reaction.enhancedUnavailableTitle': 'Reaction sent',
        'reaction.enhancedUnavailableBody': 'Enhanced view unavailable, so we sent the reaction video.',
      };
      return values[key] ?? key;
    },
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

// Mock navigation
const mockRouter = router;

// Mock services/uploadQueue
jest.mock('@/services/uploadQueue', () => ({
  uploadWithRetry: jest.fn(() => Promise.resolve({ downloadUrl: 'https://cdn.test/reaction.mp4' })),
}));

// Mock queries/useGasps
const mockCloseViewMutate = jest.fn();
const mockCreateReactionMutateAsync = jest.fn(() => Promise.resolve());

jest.mock('@/hooks/queries/useGasps', () => ({
  useCloseViewGasp: () => ({ mutate: mockCloseViewMutate }),
  useCreateReaction: () => ({ mutateAsync: mockCreateReactionMutateAsync }),
}));

// Mock stores
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'user-123' } }),
}));

jest.mock('@/stores/chatStore', () => ({
  useChatStore: () => ({ sendMessage: jest.fn() }),
}));

describe('useViewGasp', () => {
  const defaultProps: Parameters<typeof useViewGasp>[0] = {
    gasp: null,
    conversationId: '',
    messageId: '',
    holdDurationS: 5,
    isRevealed: { value: 0 } as SharedValue<number>,
    startProgressAnimation: jest.fn(),
    resetProgress: jest.fn(),
    gaspUrl: 'https://cdn.test/gasp.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    defaultProps.isRevealed = { value: 0 } as SharedValue<number>;
    defaultProps.startProgressAnimation = jest.fn();
    defaultProps.resetProgress = jest.fn();
  });

  // ── Return shape ──────────────────────────────────────────────────────────────

  describe('return shape', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));

      expect(result.current.reactionCameraRef).toBeDefined();
      expect(result.current.gaspIdRef).toBeDefined();
      expect(result.current.openedRef).toBeDefined();
      expect(result.current.isCountingDown).toBe(false);
      expect(result.current.isRecording).toBe(false);
      expect(result.current.previewUri).toBeNull();
      expect(typeof result.current.handleHoldStart).toBe('function');
      expect(typeof result.current.handleCountdownComplete).toBe('function');
      expect(typeof result.current.handleRelease).toBe('function');
      expect(typeof result.current.handleSend).toBe('function');
      expect(typeof result.current.handleDiscard).toBe('function');
      expect(result.current.MAX_REACTION_DURATION_S).toBe(30);
    });
  });

  // ── handleHoldStart ───────────────────────────────────────────────────────────

  describe('handleHoldStart', () => {
    it('sets isCountingDown to true', () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));

      act(() => {
        result.current.handleHoldStart();
      });

      expect(result.current.isCountingDown).toBe(true);
    });
  });

  // ── handleCountdownComplete ───────────────────────────────────────────────────

  describe('handleCountdownComplete', () => {
    it('calls startProgressAnimation', () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));

      act(() => {
        result.current.handleCountdownComplete();
      });

      expect(defaultProps.startProgressAnimation).toHaveBeenCalledTimes(1);
    });

    it('starts recording at the reveal when the camera was not ready during the countdown', () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));
      const recordAsync = jest.fn(() => Promise.resolve({ uri: 'file://video.mp4' }));
      result.current.reactionCameraRef.current = {
        recordAsync,
        stopRecording: jest.fn(),
      } as unknown as CameraView;

      act(() => {
        result.current.handleHoldStart();
        result.current.handleCountdownComplete();
      });

      expect(recordAsync).toHaveBeenCalledTimes(1);
      expect(result.current.isRecording).toBe(true);
    });
  });

  describe('handleCameraReady', () => {
    const mockCamera = () => ({
      recordAsync: jest.fn(() => new Promise<{ uri: string }>(() => {})),
      stopRecording: jest.fn(),
    });

    it('starts recording during the countdown, before the reveal', () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));
      const camera = mockCamera();
      result.current.reactionCameraRef.current = camera as unknown as CameraView;

      act(() => {
        result.current.handleHoldStart();
        result.current.handleCameraReady();
      });

      expect(camera.recordAsync).toHaveBeenCalledTimes(1);
      // 5s gasp + 3s countdown + 1s slack
      expect(camera.recordAsync).toHaveBeenCalledWith({ maxDuration: 9 });
      expect(result.current.isRecording).toBe(true);
      expect(defaultProps.startProgressAnimation).not.toHaveBeenCalled();
    });

    it('does not start a second recording at the reveal', () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));
      const camera = mockCamera();
      result.current.reactionCameraRef.current = camera as unknown as CameraView;

      act(() => {
        result.current.handleHoldStart();
        result.current.handleCameraReady();
        result.current.handleCountdownComplete();
      });

      expect(camera.recordAsync).toHaveBeenCalledTimes(1);
    });

    it('does not record after the hold was released', async () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));
      const camera = mockCamera();

      act(() => {
        result.current.handleHoldStart();
      });
      await act(async () => {
        await result.current.handleRelease();
      });
      result.current.reactionCameraRef.current = camera as unknown as CameraView;
      act(() => {
        result.current.handleCameraReady();
      });

      expect(camera.recordAsync).not.toHaveBeenCalled();
    });
  });

  // ── handleRelease ─────────────────────────────────────────────────────────────

  describe('handleRelease', () => {
    it('sets isCountingDown to false', async () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));

      act(() => {
        result.current.handleHoldStart();
      });
      expect(result.current.isCountingDown).toBe(true);

      await act(async () => {
        await result.current.handleRelease();
      });

      expect(result.current.isCountingDown).toBe(false);
    });

    it('shows an error alert when the media was revealed but no video was captured', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() => useViewGasp(defaultProps));

      act(() => {
        result.current.handleHoldStart();
        result.current.handleCountdownComplete();
      });
      await act(async () => {
        await result.current.handleRelease();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Recording failed',
        'Could not capture your reaction. Please try again.',
        expect.any(Array),
      );
      expect(mockRouter.back).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });
  });

  // ── Consumption only on reveal ────────────────────────────────────────────────

  describe('gasp consumption', () => {
    it('calls onReveal when the countdown completes', () => {
      const onReveal = jest.fn();
      const { result } = renderHook(() => useViewGasp({ ...defaultProps, onReveal }));

      act(() => {
        result.current.handleHoldStart();
        result.current.handleCountdownComplete();
      });

      expect(onReveal).toHaveBeenCalledTimes(1);
    });

    it('releasing during the countdown resets quietly without consuming the gasp', async () => {
      const onReveal = jest.fn();
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() => useViewGasp({ ...defaultProps, onReveal }));

      act(() => {
        result.current.handleHoldStart();
      });
      await act(async () => {
        await result.current.handleRelease();
      });
      // A late countdown tick after release must not reveal the gasp either.
      act(() => {
        result.current.handleCountdownComplete();
      });

      expect(onReveal).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
      expect(defaultProps.resetProgress).toHaveBeenCalledTimes(1);
      expect(result.current.isCountingDown).toBe(false);
      alertSpy.mockRestore();
    });

    it('allows holding again after an early release', async () => {
      const onReveal = jest.fn();
      const { result } = renderHook(() => useViewGasp({ ...defaultProps, onReveal }));

      act(() => {
        result.current.handleHoldStart();
      });
      await act(async () => {
        await result.current.handleRelease();
      });
      act(() => {
        result.current.handleHoldStart();
        result.current.handleCountdownComplete();
      });

      expect(result.current.isCountingDown).toBe(true);
      expect(onReveal).toHaveBeenCalledTimes(1);
    });
  });

  // ── handleDiscard ─────────────────────────────────────────────────────────────

  describe('handleDiscard', () => {
    it('navigates back', () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));

      act(() => {
        result.current.handleDiscard();
      });

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('calls closeViewMutation when gaspId is set', () => {
      const { result } = renderHook(() => useViewGasp(defaultProps));

      // Set gaspId as if gasp was opened
      result.current.gaspIdRef.current = 'gasp-123';

      act(() => {
        result.current.handleDiscard();
      });

      expect(mockCloseViewMutate).toHaveBeenCalledWith('gasp-123');
    });
  });
});
