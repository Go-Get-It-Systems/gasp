import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useMediaCacheStore } from '@/stores/mediaCacheStore';
import { usePendingGasps } from '@/hooks/queries/useGasps';
import { cacheMedia } from '@/services/mediaCache';

export function useAutoDownload(): void {
  const { data: pendingGasps = [] } = usePendingGasps();
  const cachedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Find newly added gasps (not yet attempted)
    const newGasps = pendingGasps.filter((g) => !cachedIdsRef.current.has(g.id));
    if (newGasps.length === 0) return;

    // Mark as attempted immediately to avoid duplicates
    for (const g of newGasps) {
      cachedIdsRef.current.add(g.id);
    }

    // Check network and download
    NetInfo.fetch().then((state) => {
      const connectionType = state.type; // 'wifi' | 'cellular' | 'none' | etc.
      const { shouldAutoDownload } = useMediaCacheStore.getState();

      for (const gasp of newGasps) {
        const mediaType = gasp.mediaType ?? 'image';
        if (shouldAutoDownload(mediaType, connectionType) && gasp.imageUri) {
          // Fire and forget — cacheMedia handles errors internally
          cacheMedia(gasp.imageUri, gasp.expiresAt).catch(() => {});
        }
      }
    });
  }, [pendingGasps]);
}
