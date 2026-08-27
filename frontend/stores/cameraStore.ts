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

  toggleFacing: () => void;
  cycleFlash: () => void;
  setCapturedUri: (uri: string | null) => void;
  setRecording: (recording: boolean) => void;
  cycleTimer: () => void;
  toggleGrid: () => void;
}

const FLASH_CYCLE: FlashMode[] = ['off', 'on', 'auto'];
const TIMER_CYCLE: TimerDuration[] = [0, 3, 10];

export const useCameraStore = create<CameraState>((set) => ({
  facing: 'back',
  flashMode: 'off',
  isRecording: false,
  lastCapturedUri: null,
  timerDuration: 0,
  showGrid: false,

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
}));
