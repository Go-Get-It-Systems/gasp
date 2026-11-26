import { create } from 'zustand';
import type { StudioWorkspace } from '@/services/api/schemas/studio.schema';
import { queryKeys } from '@/services/queryKeys';
import { useAuthStore } from './authStore';

// Only the selected workspace is UI state. All Studio reads stay in React Query.
export const useBusinessStore = create<{
  activeWorkspace: StudioWorkspace | null;
  setActiveWorkspace: (workspace: StudioWorkspace | null) => void;
  exitStudio: () => void;
}>((set) => ({
  activeWorkspace: null,
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
  exitStudio: () => set({ activeWorkspace: null }),
}));

useAuthStore.subscribe((current, previous) => {
  if (current.user?.id !== previous.user?.id || current.user?.accountType !== previous.user?.accountType) {
    useBusinessStore.getState().exitStudio();
  }
});

const key = (resource: string, ...ids: string[]) => queryKeys.business.studio(useAuthStore.getState().user?.id ?? '', resource, ...ids);
export const businessQueryKeys = {
  mine: () => key('workspaces'),
  overview: (workspaceId: string) => key('overview', workspaceId),
  campaigns: (workspaceId: string) => key('campaigns', workspaceId),
  metrics: (workspaceId: string) => key('metrics', workspaceId),
  reactions: (workspaceId: string) => key('reactions', workspaceId),
};
