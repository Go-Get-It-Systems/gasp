import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore } from '@/stores/inboxStore';
import { mapFriendToInbox } from '@/stores/inboxStore';
import { useFriends } from '@/hooks/queries/useFriends';
import { usePendingGasps } from '@/hooks/queries/useGasps';

/**
 * Triggers initial data fetch when authenticated.
 * React Query handles caching and deduplication.
 * Real-time updates come via Socket.IO → React Query cache.
 * Also syncs friends data into inboxStore for online status tracking + UI.
 */
export function useOnlineStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: friends } = useFriends(isAuthenticated);
  usePendingGasps(isAuthenticated);

  // Sync React Query friends data into inboxStore for online status tracking + UI
  useEffect(() => {
    if (friends) {
      const mapped = friends.map(mapFriendToInbox);
      useInboxStore.getState().setFriends(mapped);
      const onlineCount = mapped.filter(f => f.onlineStatus === 'online').length;
      useInboxStore.getState().setStats({
        friendCount: mapped.length,
        newGaspCount: useInboxStore.getState().newGaspCount,
        onlineCount,
      });
    }
  }, [friends]);
}
