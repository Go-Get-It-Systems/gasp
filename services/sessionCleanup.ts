import { queryClient } from '@/lib/queryClient';
import { clearAllCache } from '@/services/mediaCache';
import { clearUploadQueue } from '@/services/uploadQueue';
import { useChatStore } from '@/stores/chatStore';
import { useGaspStore } from '@/stores/gaspStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useCameraStore } from '@/stores/cameraStore';
import { useMediaCacheStore } from '@/stores/mediaCacheStore';
import { clearMediaGrants } from '@/services/privateMedia';
import { Image } from 'expo-image';

/** In-memory data disappears synchronously, before any disk or network wait. */
export async function clearSessionData(): Promise<void> {
  clearMediaGrants();
  const cancelled = queryClient.cancelQueries?.();
  queryClient.clear?.();
  useChatStore.setState(useChatStore.getInitialState(), true);
  useGaspStore.setState(useGaspStore.getInitialState(), true);
  useInboxStore.setState(useInboxStore.getInitialState(), true);
  useNotificationStore.setState(useNotificationStore.getInitialState(), true);
  useCameraStore.setState({ lastCapturedUri: null, isRecording: false });
  useMediaCacheStore.getState().setCacheSize(0);
  await Promise.allSettled([
    cancelled, clearAllCache(), clearUploadQueue(),
    Promise.resolve().then(() => Image.clearMemoryCache?.()),
    Promise.resolve().then(() => Image.clearDiskCache?.()),
  ]);
}
