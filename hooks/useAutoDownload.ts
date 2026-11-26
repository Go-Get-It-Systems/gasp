import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '@/stores/authStore';
import { useMediaCacheStore } from '@/stores/mediaCacheStore';
import { usePendingGasps } from '@/hooks/queries/useGasps';
import { cacheMedia } from '@/services/mediaCache';

export function useAutoDownload(): void {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  // Browsers load media on demand through their HTTP cache; only native apps
  // have an offline file cache to populate after session restoration finishes.
  const enabled = Platform.OS !== 'web' && isInitialized && isAuthenticated && !!token;
  const { data: pendingGasps = [] } = usePendingGasps(enabled);
  const cachedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) {
      cachedIdsRef.current.clear();
      return;
    }

    // Find newly added gasps (not yet attempted)
    const newGasps = pendingGasps.filter((g) => !cachedIdsRef.current.has(g.id));
    if (newGasps.length === 0) return;

    // Mark as attempted immediately to avoid duplicates
    for (const g of newGasps) {
      cachedIdsRef.current.add(g.id);
    }

    // Check network and download
    NetInfo.fetch().then((state) => {
      // A network check can finish after logout or a change of account.
      if (useAuthStore.getState().token !== token) return;
      const connectionType = state.type; // 'wifi' | 'cellular' | 'none' | etc.
      const { shouldAutoDownload } = useMediaCacheStore.getState();

      for (const gasp of newGasps) {
        const mediaType = gasp.mediaType ?? 'image';
        if (shouldAutoDownload(mediaType, connectionType) && gasp.imageUri) {
          // Fire and forget — cacheMedia handles errors internally
          cacheMedia(gasp.imageUri, gasp.expiresAt).catch(() => {});
        }
      }
    }).catch(() => {
      // Network information is best effort; loading media on demand still works.
    });
  }, [enabled, pendingGasps, token]);
}
