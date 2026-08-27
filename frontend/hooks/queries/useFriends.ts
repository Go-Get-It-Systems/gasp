import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import * as friendsApi from '@/services/api/friends';
import { z } from 'zod';
import { FriendSchema } from '@/services/api/schemas/user.schema';
import { validateResponse } from '@/services/api/schemas/common.schema';
import { FriendRequestSchema } from '@/services/api/schemas/friendRequest.schema';
import { isTransientError } from './queryHelpers';

export function useFriends(enabled = true) {
  return useQuery({
    queryKey: queryKeys.friends.all,
    queryFn: async () => {
      const data = await friendsApi.listFriends();
      return validateResponse(z.array(FriendSchema), data, 'listFriends');
    },
    enabled,
  });
}

export function usePendingFriendRequests(enabled = true) {
  return useQuery({
    queryKey: queryKeys.friends.requests,
    queryFn: async () => {
      const data = await friendsApi.getPendingRequests();
      return validateResponse(z.array(FriendRequestSchema), data, 'getPendingRequests');
    },
    enabled,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addresseeId: string) => friendsApi.sendRequest(addresseeId),
    retry: (failureCount, error) => failureCount < 1 && isTransientError(error),
    retryDelay: 1500,
    onSuccess: (_, addresseeId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(addresseeId) });
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) => friendsApi.acceptRequest(friendshipId),
    retry: (failureCount, error) => failureCount < 1 && isTransientError(error),
    retryDelay: 1500,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests });
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
    },
  });
}

export function useRejectFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) => friendsApi.rejectRequest(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests });
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) => friendsApi.removeFriend(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.all });
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
    },
  });
}
