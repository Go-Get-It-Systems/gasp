import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/services/queryKeys';
import { useBusinessActor } from './queries/useBusiness';

export function useBusinessRefresh() {
  const actor = useBusinessActor();
  const previous = useRef(actor);
  useEffect(() => {
    const old = previous.current;
    previous.current = actor;
    if (old && old !== actor) {
      void queryClient.cancelQueries({ queryKey: queryKeys.business.actor(old) }).catch((error) => Sentry.captureException(error));
      queryClient.removeQueries({ queryKey: queryKeys.business.actor(old) });
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && actor) void queryClient.invalidateQueries({ queryKey: queryKeys.business.actor(actor) }).catch((error) => Sentry.captureException(error));
    });
    return () => sub.remove();
  }, [actor]);
}
