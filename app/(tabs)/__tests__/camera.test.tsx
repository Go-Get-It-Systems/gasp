/**
 * CameraScreen Tests
 *
 * Tests camera mode switching (picture/video), photo capture flow,
 * video recording with timeout delay, quick-release guard,
 * double long press deduplication, and cleanup on unmount.
 */

// ── Module mocks (inline jest.fn only — no external vars in factories) ──────

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

let lastCameraMode: string | undefined;

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: React.forwardRef((props: any, ref: any) => {
      // Side-channel: track the mode prop for assertions
      lastCameraMode = props.mode;
      return <View ref={ref} />;
    }),
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
    useMicrophonePermissions: () => [{ granted: true }, jest.fn()],
  };
});

jest.mock('@/hooks/useCamera', () => ({
  useCamera: jest.fn(),
}));

jest.mock('@/services/navigation', () => ({
  openCameraPreview: jest.fn(),
}));

jest.mock('@/components/camera/CameraOverlay', () => ({
  CameraOverlay: jest.fn(() => null),
}));

jest.mock('@/components/camera/GridOverlay', () => ({
  GridOverlay: () => null,
}));

jest.mock('@/components/camera/TimerCountdown', () => ({
  TimerCountdown: () => null,
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  CameraOff: () => null,
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import React from 'react';
import { render, act } from '@testing-library/react-native';
import CameraScreen from '@/app/(tabs)/camera';
import { useCameraStore } from '@/stores/cameraStore';
import { useCamera } from '@/hooks/useCamera';
import { openCameraPreview } from '@/services/navigation';
import { CameraOverlay } from '@/components/camera/CameraOverlay';

// ── Typed mock helpers ──────────────────────────────────────────────────────

const mockUseCamera = useCamera as jest.Mock;
const mockOpenCameraPreview = openCameraPreview as jest.Mock;
const MockCameraOverlay = CameraOverlay as jest.Mock;

// Stable mock fns configured in beforeEach via mockUseCamera.mockReturnValue
const mockTakePicture = jest.fn();
const mockStartRecording = jest.fn();
const mockStopRecording = jest.fn();

/** Helper: get the last props passed to CameraOverlay */
function getOverlayProps(): Record<string, any> {
  const calls = MockCameraOverlay.mock.calls;
  return calls[calls.length - 1][0];
}

// ── Test suite ──────────────────────────────────────────────────────────────

describe('CameraScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    lastCameraMode = undefined;

    mockUseCamera.mockReturnValue({
      cameraRef: { current: {} },
      facing: 'back',
      flashMode: 'off',
      toggleFacing: jest.fn(),
      cycleFlash: jest.fn(),
      takePicture: mockTakePicture,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
    });

    useCameraStore.setState({
      facing: 'back',
      flashMode: 'off',
      isRecording: false,
      lastCapturedUri: null,
      timerDuration: 0,
      showGrid: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Default state ───────────────────────────────────────────────────────────

  describe('default camera mode', () => {
    it('initializes CameraView with picture mode', () => {
      render(<CameraScreen />);

      expect(lastCameraMode).toBe('picture');
    });
  });

  // ── Photo capture (tap) ─────────────────────────────────────────────────────

  describe('photo capture (tap)', () => {
    it('calls takePicture when onCapture is triggered', async () => {
      mockTakePicture.mockResolvedValueOnce('file:///photo.jpg');
      render(<CameraScreen />);

      await act(async () => {
        await getOverlayProps().onCapture();
      });

      expect(mockTakePicture).toHaveBeenCalledTimes(1);
    });

    it('navigates to preview with the captured URI', async () => {
      mockTakePicture.mockResolvedValueOnce('file:///photo.jpg');
      render(<CameraScreen />);

      await act(async () => {
        await getOverlayProps().onCapture();
      });

      expect(mockOpenCameraPreview).toHaveBeenCalledWith({
        imageUri: 'file:///photo.jpg',
      });
    });

    it('does not navigate when takePicture returns null', async () => {
      mockTakePicture.mockResolvedValueOnce(null);
      render(<CameraScreen />);

      await act(async () => {
        await getOverlayProps().onCapture();
      });

      expect(mockOpenCameraPreview).not.toHaveBeenCalled();
    });

    it('stays in picture mode throughout capture', async () => {
      mockTakePicture.mockResolvedValueOnce('file:///photo.jpg');
      render(<CameraScreen />);

      await act(async () => {
        await getOverlayProps().onCapture();
      });

      expect(lastCameraMode).toBe('picture');
    });

    it('blocks capture while recording is active', async () => {
      useCameraStore.setState({ isRecording: true });
      render(<CameraScreen />);

      await act(async () => {
        await getOverlayProps().onCapture();
      });

      expect(mockTakePicture).not.toHaveBeenCalled();
    });
  });

  // ── Video recording (long press) ────────────────────────────────────────────

  describe('video recording (long press)', () => {
    it('switches to video mode immediately on long press start', () => {
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      expect(lastCameraMode).toBe('video');
    });

    it('does not call startRecording before mode switch delay', () => {
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      expect(mockStartRecording).not.toHaveBeenCalled();
    });

    it('calls startRecording after mode switch delay', async () => {
      mockStartRecording.mockResolvedValueOnce('file:///video.mp4');
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockStartRecording).toHaveBeenCalledTimes(1);
    });

    it('navigates to preview with isVideo after recording completes', async () => {
      mockStartRecording.mockResolvedValueOnce('file:///video.mp4');
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockOpenCameraPreview).toHaveBeenCalledWith({
        imageUri: 'file:///video.mp4',
        isVideo: true,
      });
    });

    it('resets to picture mode after recording completes', async () => {
      mockStartRecording.mockResolvedValueOnce('file:///video.mp4');
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(lastCameraMode).toBe('picture');
    });

    it('does not navigate when recording returns null', async () => {
      mockStartRecording.mockResolvedValueOnce(null);
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockOpenCameraPreview).not.toHaveBeenCalled();
    });

    it('still resets to picture mode when recording returns null', async () => {
      mockStartRecording.mockResolvedValueOnce(null);
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(lastCameraMode).toBe('picture');
    });
  });

  // ── Quick release guard ─────────────────────────────────────────────────────

  describe('quick release (race condition guard)', () => {
    it('does not start recording when released before delay', () => {
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      act(() => {
        getOverlayProps().onLongPressEnd();
      });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(mockStartRecording).not.toHaveBeenCalled();
    });

    it('resets camera to picture mode after quick release + delay', () => {
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      expect(lastCameraMode).toBe('video');

      act(() => {
        getOverlayProps().onLongPressEnd();
      });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(lastCameraMode).toBe('picture');
    });

    it('calls stopRecording on release even if not yet recording', () => {
      render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      act(() => {
        getOverlayProps().onLongPressEnd();
      });

      expect(mockStopRecording).toHaveBeenCalledTimes(1);
    });
  });

  // ── Double long press ───────────────────────────────────────────────────────

  describe('rapid consecutive long presses', () => {
    it('cancels previous timeout so startRecording fires only once', async () => {
      mockStartRecording.mockResolvedValue('file:///video.mp4');
      render(<CameraScreen />);

      // First long press
      act(() => {
        getOverlayProps().onLongPressStart();
      });

      // Quick release
      act(() => {
        getOverlayProps().onLongPressEnd();
      });

      // Second long press before first timeout fires
      act(() => {
        getOverlayProps().onLongPressStart();
      });

      // Advance past both potential timeouts
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      // Only the second press's timeout fires (first was cleared)
      expect(mockStartRecording).toHaveBeenCalledTimes(1);
    });
  });

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  describe('cleanup on unmount', () => {
    it('clears pending timeout when component unmounts during delay', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = render(<CameraScreen />);

      act(() => {
        getOverlayProps().onLongPressStart();
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
