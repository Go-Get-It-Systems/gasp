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
}

function createFakeCamera(): FakeCamera {
  let finish: ((value: { uri: string } | undefined) => void) | null = null;
  let fail: ((reason: Error) => void) | null = null;
  const camera: FakeCamera = {
    clipUri: 'file:///reaction.mov',
    recordAsync: jest.fn((_opts: { maxDuration: number }) =>
      new Promise<{ uri: string } | undefined>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      })),
    stopRecording: jest.fn(() => finish?.(camera.clipUri ? { uri: camera.clipUri } : undefined)),
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
  countdown?: { onCountdownComplete: () => void };
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

async function flush() {
  await act(async () => {
    for (let i = 0; i < 25; i += 1) await Promise.resolve();
  });
}
function holdStart() {
  act(() => mockHold.opts!.onHoldStart());
}
function cameraReady() {
  act(() => mockUi.capture!.onCameraReady());
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

    it('falls back to starting at the reveal when the camera was not ready in time', () => {
      openFromInbox();
      holdStart();
      expect(mockCamera.recordAsync).not.toHaveBeenCalled();

      countdownEnds();

      expect(mockCamera.recordAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('C4. REC shows the real recording', () => {
    it('is off until recording starts and counts from the recording start', () => {
      openFromInbox();
      holdStart();
      expect(mockUi.hold!.isRecording).toBe(false);
      expect(mockUi.hold!.recordingStartedAt).toBeNull();

      cameraReady();
      countdownEnds();

      // Started at T0, so at the reveal the clock reads ~0:03 (see RecordingHud tests).
      expect(mockUi.hold!.isRecording).toBe(true);
      expect(mockUi.hold!.recordingStartedAt).toBe(T0);
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
      expect(mockUi.hold!.isRecording).toBe(true);

      act(() => mockCamera.failRecording());
      await flush();

      expect(mockUi.hold!.isRecording).toBe(false);
    });
  });

  describe('C5. releasing after the reveal', () => {
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

  describe('known gap (contract: "Lacunas conhecidas")', () => {
    it('a reaction sent from the chat replies to the message but leaves the server gasp "opened"', async () => {
      openFromChat();
      await watchWholeGasp();
      await send();

      expect(mockSendMessage).toHaveBeenCalledWith('conv-1', expect.objectContaining({
        type: 'reaction',
        mediaUrl: 'https://cdn.test/composite.mp4',
        replyToId: 'msg-1',
      }));
      expect(mockServer.calls).toEqual(['open']);
      expect(mockServer.status).toBe('opened');
    });
  });
});
