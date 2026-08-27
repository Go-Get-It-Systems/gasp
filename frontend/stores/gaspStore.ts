import { create } from 'zustand';
import type { Gasp, Reaction } from '@/services/api/schemas/gasp.schema';

interface GaspState {
  reactions: Reaction[];
  currentViewingGasp: Gasp | null;
  isHolding: boolean;
  holdProgress: number;
  viewedChatGaspIds: Record<string, true>;
  viewedGaspUrls: Record<string, true>;

  setCurrentGasp: (gasp: Gasp | null) => void;
  setHolding: (holding: boolean) => void;
  setHoldProgress: (progress: number) => void;
  addReaction: (reaction: Reaction) => void;
  markGaspViewed: (gaspId: string, imageUri?: string) => void;
  markChatGaspViewed: (messageId: string, mediaUrl?: string) => void;
  isGaspMediaViewed: (mediaUrl: string) => boolean;
  isChatGaspViewed: (messageId: string) => boolean;
  clearViewedChatGasps: () => void;
}

export const useGaspStore = create<GaspState>((set, get) => ({
  reactions: [],
  currentViewingGasp: null,
  isHolding: false,
  holdProgress: 0,
  viewedChatGaspIds: {},
  viewedGaspUrls: {},

  setCurrentGasp: (gasp) => set({ currentViewingGasp: gasp }),
  setHolding: (isHolding) => set({ isHolding }),
  setHoldProgress: (holdProgress) => set({ holdProgress }),

  addReaction: (reaction) =>
    set((state) => ({ reactions: [reaction, ...state.reactions] })),

  markGaspViewed: (gaspId: string, imageUri?: string) =>
    set((state) => ({
      viewedGaspUrls: imageUri
        ? { ...state.viewedGaspUrls, [imageUri]: true }
        : state.viewedGaspUrls,
    })),

  markChatGaspViewed: (messageId, mediaUrl) =>
    set((state) => ({
      viewedChatGaspIds: { ...state.viewedChatGaspIds, [messageId]: true },
      viewedGaspUrls: mediaUrl
        ? { ...state.viewedGaspUrls, [mediaUrl]: true }
        : state.viewedGaspUrls,
    })),

  isGaspMediaViewed: (mediaUrl) => !!get().viewedGaspUrls[mediaUrl],

  isChatGaspViewed: (messageId) => !!get().viewedChatGaspIds[messageId],

  clearViewedChatGasps: () => set({ viewedChatGaspIds: {}, viewedGaspUrls: {} }),
}));
