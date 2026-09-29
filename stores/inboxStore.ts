import { useMemo } from 'react';
import { create } from 'zustand';
import type { Friend } from '@/services/api/schemas/user.schema';

export type FriendAction = 'thumbnail' | 'badge' | 'eye' | 'none';

export interface InboxFriend {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  onlineStatus: 'online' | 'offline' | 'away';
  statusText: string;
  statusEmoji: string;
  timestamp: string;
  actionType: FriendAction;
  badgeCount: number;
  thumbnailUrl: string | null;
  friendshipId: string;
}

interface InboxState {
  friends: InboxFriend[];
  friendCount: number;
  newGaspCount: number;
  onlineCount: number;
  searchQuery: string;

  setFriends: (friends: InboxFriend[]) => void;
  setSearchQuery: (query: string) => void;
  setStats: (stats: { friendCount: number; newGaspCount: number; onlineCount: number }) => void;
  setFriendOnlineStatus: (userId: string, status: 'online' | 'offline') => void;
  setBulkOnlineStatus: (onlineUserIds: string[]) => void;
}

/** Map backend Friend to InboxFriend for UI */
export function mapFriendToInbox(friend: Friend): InboxFriend {
  return {
    id: friend.id,
    name: friend.displayName,
    username: friend.username,
    avatarUrl: friend.avatarUrl,
    onlineStatus: friend.onlineStatus ?? 'offline',
    statusText: '',
    statusEmoji: '',
    timestamp: '',
    actionType: 'none',
    badgeCount: 0,
    thumbnailUrl: null,
    friendshipId: friend.friendshipId,
  };
}

export const useInboxStore = create<InboxState>((set) => ({
  friends: [],
  friendCount: 0,
  newGaspCount: 0,
  onlineCount: 0,
  searchQuery: '',

  setFriends: (friends) => set({ friends }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStats: ({ friendCount, newGaspCount, onlineCount }) =>
    set({ friendCount, newGaspCount, onlineCount }),

  setFriendOnlineStatus: (userId, status) =>
    set((state) => {
      const friend = state.friends.find((f) => f.id === userId);
      // Skip if friend not found or status unchanged (prevents duplicate events desyncing count)
      if (!friend || friend.onlineStatus === status) return state;
      const friends = state.friends.map((f) =>
        f.id === userId ? { ...f, onlineStatus: status } : f
      );
      return {
        friends,
        onlineCount: friends.filter((f) => f.onlineStatus === 'online').length,
      };
    }),

  setBulkOnlineStatus: (onlineUserIds) =>
    set((state) => ({
      friends: state.friends.map((f) => ({
        ...f,
        onlineStatus: onlineUserIds.includes(f.id) ? 'online' as const : 'offline' as const,
      })),
      onlineCount: onlineUserIds.length,
    })),
}));

// Computed via useMemo — a Zustand selector that returns `.filter(...)` produces a
// new array on every getSnapshot call, which loops useSyncExternalStore until React's
// nested update cap throws "Maximum update depth exceeded".
export function useFilteredFriends() {
  const friends = useInboxStore((s) => s.friends);
  const searchQuery = useInboxStore((s) => s.searchQuery);
  return useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q),
    );
  }, [friends, searchQuery]);
}
