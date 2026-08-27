import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';

type CacheInvalidator = Pick<QueryClient, 'invalidateQueries'>;

export async function invalidateSocialPulseReactionCaches(client: CacheInvalidator): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.reactions.received }),
    client.invalidateQueries({ queryKey: queryKeys.gasps.latestMoment }),
  ]);
}
