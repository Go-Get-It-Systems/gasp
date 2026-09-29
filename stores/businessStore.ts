import type { BusinessWorkspace } from '@/services/api/business';
import * as businessApi from '@/services/api/business';
import { create } from 'zustand';

interface BusinessState {
  /** Active workspace the owner is currently operating in. */
  activeWorkspace: BusinessWorkspace | null;
  workspaces: BusinessWorkspace[];
  isLoading: boolean;
  error: string | null;

  setActiveWorkspace: (workspace: BusinessWorkspace | null) => void;

  /** Fetch owner workspaces from GET /businesses/mine. */
  fetchMyWorkspaces: () => Promise<BusinessWorkspace[]>;

  /** Clear studio state on exit (protects personal caches per R1.5). */
  exitStudio: () => void;
}

export const useBusinessStore = create<BusinessState>((set) => ({
  activeWorkspace: null,
  workspaces: [],
  isLoading: false,
  error: null,

  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

  fetchMyWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await businessApi.getMyBusinesses();
      set({
        workspaces,
        activeWorkspace: workspaces[0] ?? null,
        isLoading: false,
      });
      return workspaces;
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Failed to load workspace';
      set({ isLoading: false, error: message });
      return [];
    }
  },

  exitStudio: () => {
    // Clear studio-scoped state so it never pollutes personal profile on exit (R1.5)
    set({ activeWorkspace: null, workspaces: [], error: null });
  },
}));

// ─── Scoped React Query keys (R5.3: must include workspaceId + campaignId) ──

export const businessQueryKeys = {
  mine: () => ['businesses', 'mine'] as const,
  overview: (workspaceId: string) =>
    ['businesses', workspaceId, 'overview'] as const,
  campaigns: (workspaceId: string) =>
    ['businesses', workspaceId, 'campaigns'] as const,
  campaign: (workspaceId: string, campaignId: string) =>
    ['businesses', workspaceId, 'campaigns', campaignId] as const,
  metrics: (workspaceId: string) =>
    ['businesses', workspaceId, 'metrics'] as const,
  followStatus: (workspaceId: string) =>
    ['businesses', workspaceId, 'follow'] as const,
  reactions: (workspaceId: string) =>
    ['businesses', workspaceId, 'reactions'] as const,
  publicCampaigns: (workspaceId: string) =>
    ['businesses', workspaceId, 'campaigns', 'public'] as const,
} as const;
