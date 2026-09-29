import { create } from 'zustand';

interface Permissions {
  camera: boolean;
  microphone: boolean;
  photos: boolean;
}

interface AppState {
  hasCompletedOnboarding: boolean;
  permissions: Permissions;
  /** True while view-gasp modal is open — signals main camera to release AVCapture */
  isViewingGasp: boolean;

  setOnboarded: () => void;
  setPermissions: (perms: Partial<Permissions>) => void;
  setViewingGasp: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasCompletedOnboarding: false,
  permissions: { camera: false, microphone: false, photos: false },
  isViewingGasp: false,

  setOnboarded: () => set({ hasCompletedOnboarding: true }),
  setPermissions: (perms) => set((state) => ({ permissions: { ...state.permissions, ...perms } })),
  setViewingGasp: (value) => set({ isViewingGasp: value }),
}));
