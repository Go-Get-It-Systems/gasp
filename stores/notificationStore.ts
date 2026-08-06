import { create } from 'zustand';

export type NotificationKind =
  | 'message.new'
  | 'gasp.received'
  | 'gasp.reaction_received'
  | 'friend.request'
  | 'friend.accepted';

export interface ToastItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  route: string;
  actorName?: string;
  actorAvatarUrl?: string;
  imageUri?: string;
  blurhash?: string;
  conversationId?: string;
  gaspId?: string;
  reactionId?: string;
}

interface NotificationState {
  // Toast queue
  toastQueue: ToastItem[];
  activeToast: ToastItem | null;
  recentToastIds: string[];

  // Tab pulse trigger (counts arrivals; component resets after animating)
  tabPulseTrigger: number;

  // Per-tab unread type for Content_Type_Indicator
  inboxUnreadType: 'gasp' | 'reaction' | null;
  chatHasUnread: boolean;
  chatUnreadHintAt: number | null;

  // Actions
  enqueueToast: (item: ToastItem) => void;
  dequeueToast: () => void;
  triggerTabPulse: () => void;
  resetTabPulse: () => void;
  setInboxUnreadType: (type: 'gasp' | 'reaction' | null) => void;
  setChatHasUnread: (has: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toastQueue: [],
  activeToast: null,
  recentToastIds: [],
  tabPulseTrigger: 0,
  inboxUnreadType: null,
  chatHasUnread: false,
  chatUnreadHintAt: null,

  enqueueToast: (item) => {
    const { activeToast, toastQueue, recentToastIds } = get();
    if (recentToastIds.includes(item.id) || activeToast?.id === item.id || toastQueue.some((queued) => queued.id === item.id)) {
      return;
    }

    set((state) => ({ recentToastIds: [...state.recentToastIds, item.id].slice(-100) }));

    if (activeToast === null) {
      set({ activeToast: item });
    } else {
      set((state) => ({ toastQueue: [...state.toastQueue, item] }));
    }
  },

  dequeueToast: () => {
    set({ activeToast: null });
    setTimeout(() => {
      const { toastQueue } = get();
      if (toastQueue.length > 0) {
        const [next, ...rest] = toastQueue;
        set({ activeToast: next, toastQueue: rest });
      }
    }, 500);
  },

  triggerTabPulse: () =>
    set((state) => ({ tabPulseTrigger: state.tabPulseTrigger + 1 })),

  resetTabPulse: () => set({ tabPulseTrigger: 0 }),

  setInboxUnreadType: (type) => set({ inboxUnreadType: type }),

  setChatHasUnread: (has) => set({
    chatHasUnread: has,
    chatUnreadHintAt: has ? Date.now() : null,
  }),
}));
