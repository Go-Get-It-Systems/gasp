import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import * as usersApi from '@/services/api/users';
import { validateResponse } from '@/services/api/schemas/common.schema';
import { UserSchema, UserStatsSchema } from '@/services/api/schemas/user.schema';

export function useUserProfile(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: async () => {
      const data = await usersApi.getUserById(userId);
      return validateResponse(UserSchema, data, 'getUserById');
    },
    enabled: !!userId && enabled,
  });
}

export function useUserStats(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.stats(userId),
    queryFn: async () => {
      const data = await usersApi.getUserStats(userId);
      return validateResponse(UserStatsSchema, data, 'getUserStats');
    },
    enabled: !!userId && enabled,
    retry: 0, // Don't retry — endpoint may not exist yet in backend
  });
}
