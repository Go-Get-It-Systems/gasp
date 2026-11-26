import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { queryKeys } from '@/services/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { useBusinessStore } from '@/stores/businessStore';
import StudioScreen from './StudioScreen';

/** Isolate the unchanged Studio's legacy query keys for each signed-in account. */
export function StudioSession() {
  const actor = useAuthStore((state) => state.user?.id ?? '');
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false }, mutations: { retry: 0 } },
  }));
  // Campaign modals use the root query client. Refresh the isolated Studio
  // client when returning so publication is visible in every sub-tab.
  useFocusEffect(useCallback(() => {
    if (actor) void client.invalidateQueries({ queryKey: queryKeys.business.actor(actor) })
      .catch((error) => Sentry.captureException(error));
  }, [actor, client]));
  useEffect(() => () => {
    client.clear();
    useBusinessStore.getState().exitStudio();
  }, [client]);

  return <QueryClientProvider client={client}><StudioScreen /></QueryClientProvider>;
}
