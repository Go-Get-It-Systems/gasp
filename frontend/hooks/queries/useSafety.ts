import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import * as safetyApi from '@/services/api/safety';
import type { SubmitReportInput } from '@/services/api/schemas/safety.schema';
import { isTransientError } from './queryHelpers';

function invalidateSafetySurfaces(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.safety.blocks });
  queryClient.invalidateQueries({ queryKey: queryKeys.friends.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests });
  // Conversation and message data can contain historical content from a newly
  // blocked relationship. Remove it rather than briefly rendering stale cache.
  queryClient.removeQueries({ queryKey: queryKeys.conversations.all });
  queryClient.removeQueries({ queryKey: ['messages'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.gasps.pending });
  queryClient.invalidateQueries({ queryKey: queryKeys.gasps.sent });
  queryClient.invalidateQueries({ queryKey: queryKeys.discover.recommended });
  queryClient.invalidateQueries({ queryKey: queryKeys.discover.topGaspers });
  queryClient.invalidateQueries({ queryKey: ['users', 'search'] });
  if (userId) queryClient.removeQueries({ queryKey: queryKeys.users.profile(userId) });
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: queryKeys.safety.blocks,
    queryFn: safetyApi.listBlockedUsers,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: safetyApi.blockUser,
    retry: (failureCount, error) => failureCount < 1 && isTransientError(error),
    retryDelay: 1500,
    onSuccess: (_, userId) => invalidateSafetySurfaces(queryClient, userId),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: safetyApi.unblockUser,
    onSuccess: (_, userId) => invalidateSafetySurfaces(queryClient, userId),
  });
}

export function useSubmitReport() {
  return useMutation({
    mutationFn: (input: SubmitReportInput) => safetyApi.submitReport(input),
    retry: false,
  });
}
