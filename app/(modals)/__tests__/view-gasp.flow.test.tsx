/**
 * Flow test for the core gasp contract (docs/gasp-view-contract.md).
 *
 * Renders the real view-gasp screen with the real useViewGasp hook and drives
 * it the way a viewer does: hold → camera ready → 3-2-1 → reveal → release →
 * send / discard. Only the edges are faked: the camera, the visual children,
 * the network, and a server that applies the backend's status transitions
 * (gasp-backend/src/modules/gasps/gasps.transitions.ts).
 *
 * Every rule C1–C8 of the contract has a block here. A fix that breaks any
 * of them must fail this file.
 */
import { act, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import ViewGaspScreen from '../view-gasp';
import { uploadWithRetry } from '@/services/uploadQueue';
import { traceFlow } from '@/services/flowTrace';

const mockReactNative = require('react-native');

// ── Fake server: mirrors the backend's open / close-view / reaction rules ──

type ServerStatus = 'pending' | 'opened' | 'viewed' | 'reacted' | 'expired';

function createFakeServer() {
  return {
    status: 'pending' as ServerStatus,
    calls: [] as string[],
    reactionDelivery: null as Promise<void> | null,
    rejectReaction: false,
    open(_id: string) {
      this.calls.push('open');
      if (this.status === 'pending') this.status = 'opened';
    },
    closeView(_id: string) {
      this.calls.push('close-view');
      if (this.status === 'opened') this.status = 'viewed';
    },
    async react(_input: { gaspId: string; videoUrl: string }) {
      this.calls.push('reaction');
      if (this.rejectReaction) throw new Error('network down');
      if (this.status === 'pending' || this.status === 'opened') this.status = 'reacted';
    },
  };
}

// ── Fake front camera ──

interface FakeCamera {
  clipUri: string | undefined;
  recordAsync: jest.Mock<Promise<{ uri: string } | undefined>, [{ maxDuration: number }]>;
  stopRecording: jest.Mock<void, []>;
  failRecording: () => void;
  /** Rejects this many upcoming recordAsync calls right away, like expo-camera
   * does when onCameraReady fired before the movie output was attached. */
  notReadyAttempts: number;
  /** stopRecording never hands back the clip, like expo-camera did on an
   * iPhone 15 Pro when a video gasp with sound played during the recording. */
  neverFinishes: boolean;
  /** When onCameraReady fired. A recordAsync issued within HANG_WINDOW_MS of
   * it is accepted but never records (stop never returns a clip): seen three
   * times on an iPhone 15 Pro, while a start ~150ms later always worked. */
  readyAt: number | null;
}

function createFakeCamera(): FakeCamera {
  let finish: ((value: { uri: string } | undefined) => void) | null = null;
  let fail: ((reason: Error) => void) | null = null;
  const camera: FakeCamera = {
    clipUri: 'file:///reaction.mov',
    notReadyAttempts: 0,
    neverFinishes: false,
    readyAt: null,
    recordAsync: jest.fn((_opts: { maxDuration: number }) => {
      if (camera.notReadyAttempts > 0) {
        camera.notReadyAttempts -= 1;
        // expo-camera rejects ~15ms later, not synchronously.
        return new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error("Camera is not ready yet. Wait for 'onCameraReady' callback")), NOT_READY_MS);
        });
      }
      if (camera.readyAt !== null && Date.now() - camera.readyAt < HANG_WINDOW_MS) {
        return new Promise<{ uri: string } | undefined>(() => {});
      }
      return new Promise<{ uri: string } | undefined>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      });
    }),
    stopRecording: jest.fn(() => {
      if (!camera.neverFinishes) finish?.(camera.clipUri ? { uri: camera.clipUri } : undefined);
    }),
    failRecording: () => fail?.(new Error('camera busy')),
  };
  return camera;
}

let mockServer = createFakeServer();
let mockCamera = createFakeCamera();
let mockPending: Record<string, unknown>[] = [];
let mockParams: Record<string, string> = {};
interface UiProbes {
  hold?: { isRecording: boolean; recordingStartedAt: number | null };
  capture?: { onCameraReady: () => void };
  countdown?: { onCountdownComplete: () => void; isActive: boolean };
  /** isRecording on every HoldToView render, to catch a REC that flashes. */
  recHistory?: boolean[];
  preview?: { onSend: () => void; onDiscard: () => void; isSending: boolean; reactionVideoUri: string };
}
interface HoldProbe {
  opts?: { onHoldStart: () => void; onHoldEnd: () => Promise<void> };
  api?: { resetProgress: jest.Mock } & Record<string, unknown>;
}
const mockUi: UiProbes = {};
const mockHold: HoldProbe = {};
const mockGaspStore = { markChatGaspViewed: jest.fn(), markGaspMediaViewed: jest.fn() };
const mockResolveReactionMediaUrl = jest.fn();
const mockSendMessage = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
  useMicrophonePermissions: () => [{ granted: true }, jest.fn()],
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: { Manual: () => ({}) },
}));
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: number) => require('react').useRef({ value: initial }).current,
  withTiming: (value: number) => value,
  Easing: { out: () => () => 0, cubic: () => 0 },
}));
jest.mock('lucide-react-native', () => ({ X: () => null, Camera: () => null, Flag: () => null }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn(), captureMessage: jest.fn() }));

// The hold gesture is driven directly through the callbacks the screen gives it.
jest.mock('@/hooks/useHoldGesture', () => ({
  useHoldGesture: (opts: unknown) => {
    mockHold.opts = opts as HoldProbe['opts'];
    return mockHold.api;
  },
}));

// Visual children are replaced by probes that expose the props the screen passes.
jest.mock('@/components/gasp/HoldToView', () => ({
  HoldToView: (props: unknown) => {
    mockUi.hold = props as UiProbes['hold'];
    mockUi.recHistory = [...(mockUi.recHistory ?? []), mockUi.hold!.isRecording];
    return null;
  },
}));
jest.mock('@/components/gasp/ReactionCapture', () => ({
  ReactionCapture: (props: { cameraRef: { current: unknown }; onCameraReady: () => void }) => {
    props.cameraRef.current = mockCamera;
    mockUi.capture = props;
    return null;
  },
}));
jest.mock('@/components/gasp/RecordingCountdown', () => ({
  RecordingCountdown: (props: unknown) => {
    mockUi.countdown = props as UiProbes['countdown'];
    return null;
  },
}));
jest.mock('@/components/gasp/ReactionPreview', () => ({
  ReactionPreview: (props: unknown) => {
    mockUi.preview = props as UiProbes['preview'];
    return <mockReactNative.Text>reaction-preview</mockReactNative.Text>;
  },
}));
jest.mock('@/components/safety/ReportSheet', () => ({ ReportSheet: () => null }));
jest.mock('@/components/ui/Text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <mockReactNative.Text>{children}</mockReactNative.Text>,
}));

jest.mock('@/hooks/queries/useGasps', () => ({
  usePendingGasps: () => ({ data: mockPending, isFetched: true }),
  useOpenGasp: () => ({ mutate: (id: string) => mockServer.open(id) }),
  useCloseViewGasp: () => ({ mutate: (id: string) => mockServer.closeView(id) }),
  useCreateReaction: () => ({
    mutateAsync: (input: { gaspId: string; videoUrl: string }) => mockServer.react(input),
  }),
}));
jest.mock('@/hooks/queries/useChat', () => ({
  useGetOrCreateConversation: () => ({ mutateAsync: jest.fn(async () => ({ id: 'conv-1' })) }),
}));
jest.mock('@/stores/gaspStore', () => ({ useGaspStore: { getState: () => mockGaspStore } }));
jest.mock('@/stores/appStore', () => ({ useAppStore: { getState: () => ({ setViewingGasp: jest.fn() }) } }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { user: { id: string } }) => unknown) => selector({ user: { id: 'viewer-1' } }),
}));
jest.mock('@/services/uploadQueue', () => ({
  uploadWithRetry: jest.fn(),
  enqueueUpload: jest.fn(async () => 'queue-1'),
  removeFromQueue: jest.fn(async () => undefined),
}));
jest.mock('@/services/videoCompression', () => ({ compressVideo: jest.fn(async (uri: string) => uri) }));
jest.mock('@/services/compositeService', () => ({
  resolveReactionMediaUrl: (...args: unknown[]) => mockResolveReactionMediaUrl(...args),
}));
jest.mock('@/services/api/messages', () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

const T0 = new Date('2026-10-11T10:00:00.000Z').getTime();
const GASP_URL = 'https://cdn.test/gasp.jpg';
const IMAGE_GASP_S = 10;
const COUNTDOWN_MS = 3000;
const RECORD_RETRY_MS = 150;
const NOT_READY_MS = 15;
const REC_CONFIRM_MS = 300;
const CLIP_TIMEOUT_MS = 4000;
const RECORD_START_DELAY_MS = 250;
const HANG_WINDOW_MS = 100;

const serverGasp = {
  id: 'gasp-1',
  senderId: 'sender-1',
  senderName: 'Bi',
  senderAvatarUrl: null,
  imageUrl: GASP_URL,
  imageUri: 'file:///gasp.jpg',
  mediaType: 'image',
  blurhash: 'L00000',
  replayable: false,
  status: 'pending',
  createdAt: '2026-10-11T09:59:00.000Z',
  expiresAt: '2026-10-12T09:59:00.000Z',
};

// ── Viewer actions ──

/** Moves the clock in 5ms steps so promise callbacks (camera rejections)
 * run at their real time instead of after the whole jump. */
async function advance(ms: number) {
  await act(async () => {
    for (let elapsed = 0; elapsed < ms; elapsed += 5) {
      jest.advanceTimersByTime(Math.min(5, ms - elapsed));
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
    }
  });
}
async function flush() {
  await act(async () => {
    for (let i = 0; i < 25; i += 1) await Promise.resolve();
  });
}
function holdStart() {
  act(() => mockHold.opts!.onHoldStart());
}
function cameraReady() {
  act(() => {
    mockCamera.readyAt = Date.now();
    mockUi.capture!.onCameraReady();
    jest.advanceTimersByTime(RECORD_START_DELAY_MS);
  });
}
function countdownEnds() {
  act(() => {
    jest.advanceTimersByTime(COUNTDOWN_MS);
    mockUi.countdown!.onCountdownComplete();
  });
}
async function release() {
  await act(async () => {
    await mockHold.opts!.onHoldEnd();
  });
}
async function send() {
  act(() => mockUi.preview!.onSend());
  await flush();
}
/** Hold through the whole gasp with the camera ready during the countdown. */
async function watchWholeGasp() {
  holdStart();
  cameraReady();
  countdownEnds();
  act(() => {
    jest.advanceTimersByTime(IMAGE_GASP_S * 1000);
  });
  await release();
}

function openFromInbox() {
  mockParams = { gaspId: 'gasp-1' };
  return render(<ViewGaspScreen />);
}
function openFromChat() {
  mockParams = {
    chatImageUri: 'file:///gasp.jpg',
    chatSenderName: 'Bi',
    chatMediaType: 'image',
    chatConversationId: 'conv-1',
    chatMessageId: 'msg-1',
    chatGaspUrl: GASP_URL,
  };
  return render(<ViewGaspScreen />);
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: T0 });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockServer = createFakeServer();
  mockCamera = createFakeCamera();
  mockPending = [serverGasp];
  for (const key of Object.keys(mockUi) as (keyof UiProbes)[]) delete mockUi[key];
  mockHold.api = {
    gesture: {},
    isHolding: { value: 0 },
    holdProgress: { value: 0 },
    touchX: { value: 0 },
    touchY: { value: 0 },
    startProgressAnimation: jest.fn(),
    resetProgress: jest.fn(),
  };
  jest.mocked(uploadWithRetry).mockResolvedValue({ downloadUrl: 'https://cdn.test/reaction.mp4' } as never);
  mockResolveReactionMediaUrl.mockImplementation(async () => 'https://cdn.test/composite.mp4');
  mockSendMessage.mockResolvedValue(undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
  jest.useRealTimers();
});

describe('gasp view contract', () => {
  describe('C1. the gasp is consumed only at the reveal', () => {
    it('does not consume on open, hold or camera ready; consumes once at the reveal', () => {
      openFromInbox();
      holdStart();
      cameraReady();
      expect(mockServer.calls).toEqual([]);
      expect(mockGaspStore.markGaspMediaViewed).not.toHaveBeenCalled();

      countdownEnds();

      expect(mockServer.calls).toEqual(['open']);
      expect(mockServer.status).toBe('opened');
      expect(mockGaspStore.markGaspMediaViewed).toHaveBeenCalledWith(GASP_URL);
    });

    it('marks the chat bubble viewed at the reveal when opened from the chat', () => {
      openFromChat();
      holdStart();
      expect(mockGaspStore.markChatGaspViewed).not.toHaveBeenCalled();

      countdownEnds();

      expect(mockGaspStore.markChatGaspViewed).toHaveBeenCalledWith('msg-1', 'file:///gasp.jpg');
      expect(mockServer.calls).toEqual(['open']);
    });

    it('opens on the server as soon as a late-resolving server gasp appears', () => {
      mockPending = [];
      const { rerender } = openFromChat();
      holdStart();
      countdownEnds();
      expect(mockServer.calls).toEqual([]);

      mockPending = [serverGasp];
      rerender(<ViewGaspScreen />);

      expect(mockServer.calls).toEqual(['open']);
    });
  });

  describe('C2. releasing during the countdown costs nothing', () => {
    it('consumes nothing, alerts nothing, and allows holding again', async () => {
      openFromInbox();
      holdStart();
      cameraReady();
      await release();
      // A late countdown tick after the release must not reveal either.
      act(() => mockUi.countdown!.onCountdownComplete());

      expect(mockServer.calls).toEqual([]);
      expect(mockGaspStore.markGaspMediaViewed).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockHold.api!.resetProgress).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('reaction-preview')).toBeNull();

      await watchWholeGasp();

      expect(mockServer.calls).toEqual(['open']);
      expect(screen.getByText('reaction-preview')).toBeTruthy();
    });
  });

  describe('C3. recording starts during the countdown', () => {
    it('starts once when the camera is ready, before the reveal', () => {
      openFromInbox();
      holdStart();
      cameraReady();

      expect(mockCamera.recordAsync).toHaveBeenCalledTimes(1);
      // 10s image + 3s countdown + 1s slack
      expect(mockCamera.recordAsync).toHaveBeenCalledWith({ maxDuration: 14 });
      expect(mockServer.calls).toEqual([]);

      countdownEnds();

      expect(mockCamera.recordAsync).toHaveBeenCalledTimes(1);
    });

    it('waits a moment after the camera reports ready before recording', async () => {
      openFromInbox();
      holdStart();
      act(() => {
        mockCamera.readyAt = Date.now();
        mockUi.capture!.onCameraReady();
      });
      expect(mockCamera.recordAsync).not.toHaveBeenCalled();

      await advance(RECORD_START_DELAY_MS);
      expect(mockCamera.recordAsync).toHaveBeenCalledTimes(1);

      countdownEnds();
      act(() => {
        jest.advanceTimersByTime(IMAGE_GASP_S * 1000);
      });
      await release();

      expect(screen.getByText('reaction-preview')).toBeTruthy();
    });

    it('falls back to starting at the reveal when the camera was not ready in time', () => {
      openFromInbox();
      holdStart();
      expect(mockCamera.recordAsync).not.toHaveBeenCalled();

      countdownEnds();

      expect(mockCamera.recordAsync).toHaveBeenCalledTimes(1);
    });

    // Seen on an iPhone 15 Pro: expo-camera fires onCameraReady before the
    // movie output exists, so the first recordAsync rejects 14ms later. The
    // recording then only began at the reveal (REC from 0:00, offset 0).
    it('retries while holding when the camera was not ready to record yet', async () => {
      mockCamera.notReadyAttempts = 2;
      openFromInbox();
      holdStart();
      cameraReady();
      await advance(NOT_READY_MS + RECORD_RETRY_MS); // attempt 1 rejected, attempt 2 starts
      await advance(NOT_READY_MS + RECORD_RETRY_MS); // attempt 2 rejected, attempt 3 starts
      await advance(REC_CONFIRM_MS);

      expect(mockCamera.recordAsync).toHaveBeenCalledTimes(3);
      expect(mockUi.hold!.isRecording).toBe(true);
      const startedAt = mockUi.hold!.recordingStartedAt!;
      const retriesMs = 2 * (NOT_READY_MS + RECORD_RETRY_MS);
      expect(startedAt).toBe(T0 + RECORD_START_DELAY_MS + retriesMs);

      // The clip still covers the reveal, so the composite lines up with it.
      await advance(COUNTDOWN_MS - retriesMs - REC_CONFIRM_MS);
      act(() => mockUi.countdown!.onCountdownComplete());
      await advance(IMAGE_GASP_S * 1000);
      await release();
      await send();

      expect(mockCamera.recordAsync).toHaveBeenCalledTimes(3);
      expect(mockResolveReactionMediaUrl).toHaveBeenCalledWith(
        'https://cdn.test/reaction.mp4',
        GASP_URL,
        COUNTDOWN_MS - retriesMs,
      );
      expect(mockServer.status).toBe('reacted');
    });

    it('stops retrying once the hold is released', async () => {
      mockCamera.notReadyAttempts = 1;
      openFromInbox();
      holdStart();
      cameraReady();
      await advance(NOT_READY_MS);
      await release();
      act(() => {
        jest.advanceTimersByTime(10 * RECORD_RETRY_MS);
      });
      await flush();

      expect(mockCamera.recordAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('C4. REC shows the real recording', () => {
    // Seen in the simulator e2e run: each rejected attempt lit "REC 0:00"
    // for ~15ms before the retry.
    it('never flashes while recording attempts are being rejected', async () => {
      mockCamera.notReadyAttempts = 20;
      openFromInbox();
      holdStart();
      cameraReady();
      await advance(COUNTDOWN_MS);

      expect(mockCamera.recordAsync.mock.calls.length).toBeGreaterThan(1);
      expect(mockUi.recHistory).not.toContain(true);
    });

    it('is off until recording starts and counts from the recording start', () => {
      openFromInbox();
      holdStart();
      expect(mockUi.hold!.isRecording).toBe(false);
      expect(mockUi.hold!.recordingStartedAt).toBeNull();

      cameraReady();
      countdownEnds();

      // Started during the countdown, so at the reveal the clock reads ~0:03 (see RecordingHud tests).
      expect(mockUi.hold!.isRecording).toBe(true);
      expect(mockUi.hold!.recordingStartedAt).toBe(T0 + RECORD_START_DELAY_MS);
    });

    it('turns off when the hold ends', async () => {
      openFromInbox();
      await watchWholeGasp();

      expect(mockUi.hold!.isRecording).toBe(false);
      expect(mockUi.hold!.recordingStartedAt).toBeNull();
    });

    it('turns off when the camera fails to record', async () => {
      openFromInbox();
      holdStart();
      cameraReady();
      await advance(REC_CONFIRM_MS);
      expect(mockUi.hold!.isRecording).toBe(true);

      act(() => mockCamera.failRecording());
      await flush();

      expect(mockUi.hold!.isRecording).toBe(false);
    });
  });

  describe('C5. releasing after the reveal', () => {
    it('ignores a new hold once the gasp was revealed', async () => {
      openFromInbox();
      await watchWholeGasp();
      const calls = mockCamera.recordAsync.mock.calls.length;

      act(() => mockHold.opts!.onHoldStart());
      act(() => mockUi.capture!.onCameraReady());
      await advance(RECORD_START_DELAY_MS);

      expect(mockCamera.recordAsync).toHaveBeenCalledTimes(calls);
      expect(mockUi.countdown!.isActive).toBe(false);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('does not hang when the camera never hands back the clip', async () => {
      mockCamera.neverFinishes = true;
      openFromInbox();
      holdStart();
      cameraReady();
      countdownEnds();
      act(() => {
        jest.advanceTimersByTime(IMAGE_GASP_S * 1000);
      });
      // release() awaits the clip, so it is not awaited here.
      act(() => {
        void mockHold.opts!.onHoldEnd();
      });
      await advance(CLIP_TIMEOUT_MS);

      expect(alertSpy).toHaveBeenCalledWith(
        'viewGasp.recordingFailedTitle',
        'viewGasp.recordingFailedBody',
        expect.any(Array),
      );
      expect(screen.queryByText('reaction-preview')).toBeNull();
    });

    it('stops recording and previews the recorded clip', async () => {
      openFromInbox();
      await watchWholeGasp();

      expect(mockCamera.stopRecording).toHaveBeenCalledTimes(1);
      expect(mockUi.preview!.reactionVideoUri).toBe('file:///reaction.mov');
    });

    it('alerts and closes when no clip was recorded', async () => {
      mockCamera.clipUri = undefined;
      openFromInbox();
      await watchWholeGasp();

      expect(screen.queryByText('reaction-preview')).toBeNull();
      expect(alertSpy).toHaveBeenCalledWith(
        'viewGasp.recordingFailedTitle',
        'viewGasp.recordingFailedBody',
        expect.any(Array),
      );
      const [{ onPress }] = alertSpy.mock.calls[0][2];
      onPress();
      expect(router.back).toHaveBeenCalled();
    });
  });

  describe('C6. the composite is lined up with the reveal', () => {
    it('sends the countdown as the reveal offset when recording began at the countdown', async () => {
      openFromInbox();
      await watchWholeGasp();
      await send();

      expect(mockResolveReactionMediaUrl).toHaveBeenCalledWith(
        'https://cdn.test/reaction.mp4',
        GASP_URL,
        COUNTDOWN_MS,
      );
    });

    it('sends a zero offset when recording only began at the reveal', async () => {
      openFromInbox();
      holdStart();
      countdownEnds();
      await release();
      await send();

      expect(mockResolveReactionMediaUrl).toHaveBeenCalledWith(
        'https://cdn.test/reaction.mp4',
        GASP_URL,
        0,
      );
    });
  });

  describe('C7. the server status ends coherent', () => {
    it('ends "reacted" after a delivered reaction', async () => {
      openFromInbox();
      await watchWholeGasp();
      await send();

      expect(mockServer.calls).toEqual(['open', 'reaction']);
      expect(mockServer.status).toBe('reacted');
    });

    it('never closes the view while the reaction is still being delivered', async () => {
      let finishComposite!: (url: string) => void;
      mockResolveReactionMediaUrl.mockImplementation(
        () => new Promise((resolve) => { finishComposite = resolve; }),
      );
      const { unmount } = openFromInbox();
      await watchWholeGasp();
      await send();

      // The screen closes right after the upload; the composite is still running.
      expect(router.back).toHaveBeenCalled();
      unmount();
      expect(mockServer.calls).toEqual(['open']);

      await act(async () => finishComposite('https://cdn.test/composite.mp4'));
      await flush();

      expect(mockServer.calls).toEqual(['open', 'reaction']);
      expect(mockServer.status).toBe('reacted');
    });

    it('ends "viewed" when the viewer discards the reaction', async () => {
      openFromInbox();
      await watchWholeGasp();
      act(() => mockUi.preview!.onDiscard());

      expect(mockServer.calls).toEqual(['open', 'close-view']);
      expect(mockServer.status).toBe('viewed');
    });

    it('ends "viewed" when the viewer leaves the screen after the reveal without reacting', async () => {
      const { unmount } = openFromInbox();
      await watchWholeGasp();
      unmount();

      expect(mockServer.calls).toEqual(['open', 'close-view']);
      expect(mockServer.status).toBe('viewed');
    });

    it('stays untouched when the viewer leaves before the reveal', async () => {
      const { unmount } = openFromInbox();
      holdStart();
      await release();
      unmount();

      expect(mockServer.calls).toEqual([]);
      expect(mockServer.status).toBe('pending');
    });
  });

  describe('C8. send failures', () => {
    it('keeps the preview and re-enables Send when the upload fails', async () => {
      jest.mocked(uploadWithRetry).mockRejectedValueOnce(new Error('offline'));
      openFromInbox();
      await watchWholeGasp();
      await send();

      expect(screen.getByText('reaction-preview')).toBeTruthy();
      expect(mockUi.preview!.isSending).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith(
        'viewGasp.uploadFailedTitle',
        'viewGasp.uploadFailedBody',
        expect.any(Array),
      );
      expect(router.back).not.toHaveBeenCalled();
      expect(mockServer.calls).toEqual(['open']);
    });

    it('closes the view when the reaction cannot be delivered', async () => {
      mockServer.rejectReaction = true;
      openFromInbox();
      await watchWholeGasp();
      await send();

      expect(mockServer.calls).toEqual(['open', 'reaction', 'close-view']);
      expect(mockServer.status).toBe('viewed');
    });
  });

  describe('dev flow trace (read by the gasp-core-e2e skill on a device)', () => {
    it('logs a full reaction in order', async () => {
      openFromInbox();
      await watchWholeGasp();
      await send();

      expect(jest.mocked(traceFlow).mock.calls.map(([step]) => step)).toEqual([
        'hold-start',
        'camera-ready',
        'recording-started',
        'reveal',
        'server-open',
        'release',
        'preview',
        'upload-done',
        'composite',
        'reaction-delivered',
      ]);
      expect(traceFlow).toHaveBeenCalledWith('recording-started', { duringCountdown: true, maxDuration: 14, attempt: 1 });
      expect(traceFlow).toHaveBeenCalledWith('composite', { revealOffsetMs: COUNTDOWN_MS, isComposite: true });
    });
  });

  describe('the same account on another device', () => {
    // Seen with an iPhone and a simulator on one account: the iPhone's
    // reaction landed while the simulator was viewing, the gasp left the
    // pending list, and Send said "Could not send reaction".
    it('explains that the gasp was answered elsewhere instead of a generic send error', async () => {
      const { rerender } = openFromInbox();
      await watchWholeGasp();

      mockPending = [];
      rerender(<ViewGaspScreen />);
      // The screen keeps the media and the recorded reaction.
      expect(screen.getByText('reaction-preview')).toBeTruthy();
      expect(alertSpy).not.toHaveBeenCalledWith('viewGasp.unavailableTitle', 'viewGasp.unavailableBody');
      await send();

      expect(alertSpy).toHaveBeenCalledWith(
        'viewGasp.answeredElsewhereTitle',
        'viewGasp.answeredElsewhereBody',
        expect.any(Array),
      );
      expect(uploadWithRetry).not.toHaveBeenCalled();
      expect(mockServer.calls).toEqual(['open']);
    });
  });

  describe('reactions sent from the chat', () => {
    // Backlog B-001: the chat path only posted a chat message, so the server
    // gasp stayed "opened" and came back to the Gasps tab after a restart.
    it('go through POST /reactions when the server gasp is known, ending "reacted"', async () => {
      openFromChat();
      await watchWholeGasp();
      await send();

      expect(mockServer.calls).toEqual(['open', 'reaction']);
      expect(mockServer.status).toBe('reacted');
      // The server posts the chat reply itself; no second message from the app.
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('fall back to a chat reply when the gasp has no server record', async () => {
      mockPending = [];
      openFromChat();
      await watchWholeGasp();
      await send();

      expect(mockSendMessage).toHaveBeenCalledWith('conv-1', expect.objectContaining({
        type: 'reaction',
        mediaUrl: 'https://cdn.test/composite.mp4',
        replyToId: 'msg-1',
      }));
      expect(mockServer.calls).toEqual([]);
    });
  });
});
