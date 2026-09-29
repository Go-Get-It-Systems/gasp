import { create } from 'zustand';

type CameraFacing = 'front' | 'back';
type FlashMode = 'off' | 'on' | 'auto';
type TimerDuration = 0 | 3 | 10;

interface CameraState {
  facing: CameraFacing;
  flashMode: FlashMode;
  isRecording: boolean;
  lastCapturedUri: string | null;
  timerDuration: TimerDuration;
  showGrid: boolean;

  /** When true, captured media goes to campaign-composer instead of send-gasp */
  campaignMode: boolean;

  /**
   * When set, captured media goes to reaction-composer for this campaign.
   * null means normal mode.
   */
  reactionTarget: { workspaceId: string; campaignId: string; campaignTitle: string } | null;

  toggleFacing: () => void;
  cycleFlash: () => void;
  setCapturedUri: (uri: string | null) => void;
  setRecording: (recording: boolean) => void;
  cycleTimer: () => void;
  toggleGrid: () => void;
  setCampaignMode: (enabled: boolean) => void;
  setReactionTarget: (target: { workspaceId: string; campaignId: string; campaignTitle: string } | null) => void;
}

const FLASH_CYCLE: FlashMode[] = ['off', 'on', 'auto'];
const TIMER_CYCLE: TimerDuration[] = [0, 3, 10];

export const useCameraStore = create<CameraState>((set) => ({
  facing: 'front', // front camera for reactions feels more natural
  flashMode: 'off',
  isRecording: false,
  lastCapturedUri: null,
  timerDuration: 0,
  showGrid: false,
  campaignMode: false,
  reactionTarget: null,

  toggleFacing: () =>
    set((state) => ({
      facing: state.facing === 'back' ? 'front' : 'back',
    })),

  cycleFlash: () =>
    set((state) => {
      const currentIndex = FLASH_CYCLE.indexOf(state.flashMode);
      const nextIndex = (currentIndex + 1) % FLASH_CYCLE.length;
      return { flashMode: FLASH_CYCLE[nextIndex] };
    }),

  setCapturedUri: (uri) => set({ lastCapturedUri: uri }),
  setRecording: (isRecording) => set({ isRecording }),

  cycleTimer: () =>
    set((state) => {
      const currentIndex = TIMER_CYCLE.indexOf(state.timerDuration);
      const nextIndex = (currentIndex + 1) % TIMER_CYCLE.length;
      return { timerDuration: TIMER_CYCLE[nextIndex]! };
    }),

  toggleGrid: () =>
    set((state) => ({ showGrid: !state.showGrid })),

  setCampaignMode: (enabled) => set({ campaignMode: enabled }),
  setReactionTarget: (target) => set({ reactionTarget: target }),
}));
