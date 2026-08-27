import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { queryKeys } from '@/services/queryKeys';
import * as gaspsApi from '@/services/api/gasps';
import * as reactionsApi from '@/services/api/reactions';
import type { Gasp } from '@/services/api/schemas/gasp.schema';
import { GaspSchema } from '@/services/api/schemas/gasp.schema';
import { validateResponse } from '@/services/api/schemas/common.schema';
import {
  updateGaspInList,
  removeFromList,
  shouldKeepInPendingAfterClose,
} from './useGasps.helpers';
import { isTransientError } from './queryHelpers';

export function usePendingGasps(enabled = true) {
  return useQuery({
    queryKey: queryKeys.gasps.pending,
    queryFn: async () => {
      const data = await gaspsApi.getPendingGasps();
      return validateResponse(z.array(GaspSchema), data, 'getPendingGasps');
    },
    enabled,
  });
}

export function useSentGasps(enabled = true) {
  return useQuery({
    queryKey: queryKeys.gasps.sent,
    queryFn: async () => {
      const data = await gaspsApi.getSentGasps();
      return validateResponse(z.array(GaspSchema), data, 'getSentGasps');
    },
    enabled,
  });
}

export function useSendBatchGasp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      recipientIds: string[];
      imageUrl: string;
      mediaType?: 'image' | 'video';
      blurhash?: string;
      textOverlay?: string;
      replayable?: boolean;
    }) => gaspsApi.sendBatchGasp(data),
    retry: (failureCount, error) => failureCount < 1 && isTransientError(error),
    retryDelay: 1500,
    onSuccess: (newGasps) => {
      queryClient.setQueryData<Gasp[]>(queryKeys.gasps.sent, (old) =>
        [...newGasps, ...(old ?? [])],
      );
    },
  });
}

/**
 * Marca gasp como `opened` no backend (janela de reação iniciada).
 * Mantém o gasp no cache pendente (vai sair apenas quando close-view ou reacted).
 */
export function useOpenGasp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gaspId: string) => gaspsApi.openGasp(gaspId),
    onSuccess: (updated) => {
      queryClient.setQueryData<Gasp[]>(queryKeys.gasps.pending, (old) =>
        updateGaspInList(old, updated),
      );
    },
  });
}

/**
 * Fecha a janela de reação. Backend marca como `viewed`.
 * Remove do cache pendente — exceto se replayable e não expirado.
 */
export function useCloseViewGasp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gaspId: string) => gaspsApi.closeViewGasp(gaspId),
    onSuccess: (updated) => {
      queryClient.setQueryData<Gasp[]>(queryKeys.gasps.pending, (old) => {
        if (shouldKeepInPendingAfterClose(updated, new Date())) {
          return updateGaspInList(old, updated);
        }
        return removeFromList(old, updated.id);
      });
    },
  });
}

/**
 * @deprecated Use useOpenGasp + useCloseViewGasp.
 */
export function useViewGasp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gaspId: string) => gaspsApi.markViewed(gaspId),
    onMutate: async (gaspId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.gasps.pending });
      const previous = queryClient.getQueryData<Gasp[]>(queryKeys.gasps.pending);
      queryClient.setQueryData<Gasp[]>(queryKeys.gasps.pending, (old) =>
        removeFromList(old, gaspId),
      );
      return { previous };
    },
    onError: (_err, _gaspId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.gasps.pending, context.previous);
      }
    },
  });
}

export function useCreateReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { gaspId: string; videoUrl: string }) =>
      reactionsApi.createReaction(data),
    retry: (failureCount, error) => failureCount < 1 && isTransientError(error),
    retryDelay: 1500,
    onSuccess: (_data, variables) => {
      // Backend marcou gasp como `reacted`. Remove do cache pending.
      queryClient.setQueryData<Gasp[]>(queryKeys.gasps.pending, (old) =>
        removeFromList(old, variables.gaspId),
      );
    },
  });
}
