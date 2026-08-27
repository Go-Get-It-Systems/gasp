import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import * as usersApi from '@/services/api/users';
import { validateResponse } from '@/services/api/schemas/common.schema';
import { UserStatsSchema } from '@/services/api/schemas/user.schema';

export function useProfileStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile.stats,
    queryFn: async () => {
      const data = await usersApi.getMyStats();
      return validateResponse(UserStatsSchema, data, 'getMyStats');
    },
    enabled,
  });
}

export function calculateGaspScore(
  sent: number,
  received: number,
  streak: number,
  reactions: number,
): number {
  return sent + received + streak * 5 + reactions;
}
