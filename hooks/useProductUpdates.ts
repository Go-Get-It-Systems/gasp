import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import { PRODUCT_UPDATES } from '@/constants/productUpdates';
import type { ProductUpdateUserState } from '@/services/api/schemas/productUpdate.schema';
import {
  emptyProductUpdateState,
  getUnreadUpdateIds,
  groupProductUpdatesByMonth,
  markProductUpdateRead,
  setProductUpdateFeedback,
} from '@/services/productUpdates';
import { loadProductUpdateUserState, saveProductUpdateUserState } from '@/services/productUpdatesStorage';

export function useProductUpdates(userId?: string, language?: string) {
  const [state, setState] = useState<ProductUpdateUserState>(emptyProductUpdateState);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    setIsReady(false);
    const nextState = await loadProductUpdateUserState(userId ?? '');
    setState(nextState);
    setIsReady(true);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persist = useCallback((nextState: ProductUpdateUserState) => {
    if (!userId) return;
    void saveProductUpdateUserState(userId, nextState).catch((error) => {
      Sentry.captureException(error, { extra: { context: 'useProductUpdates.persist' } });
    });
  }, [userId]);

  const markRead = useCallback((updateId: string) => {
    setState((previousState) => {
      const nextState = markProductUpdateRead(previousState, updateId);
      persist(nextState);
      return nextState;
    });
  }, [persist]);

  const submitFeedback = useCallback((updateId: string, helpful: boolean) => {
    setState((previousState) => {
      const nextState = setProductUpdateFeedback(previousState, updateId, helpful);
      persist(nextState);
      return nextState;
    });
  }, [persist]);

  const unreadUpdateIds = useMemo(() => getUnreadUpdateIds(PRODUCT_UPDATES, state), [state]);
  const sections = useMemo(() => groupProductUpdatesByMonth(PRODUCT_UPDATES, language), [language]);

  return {
    updates: PRODUCT_UPDATES,
    sections,
    unreadUpdateIds,
    unreadCount: unreadUpdateIds.length,
    feedbackByUpdateId: state.feedbackByUpdateId,
    isReady,
    refresh,
    markRead,
    submitFeedback,
  };
}
