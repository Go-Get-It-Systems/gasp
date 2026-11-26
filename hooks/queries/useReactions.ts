import { useInfiniteQuery } from '@tanstack/react-query';
import * as reactionsApi from '@/services/api/reactions';
import type { ReactionReturn } from '@/services/api/schemas/gasp.schema';
import type { PaginatedResponse } from '@/services/api/schemas/common.schema';
import { queryKeys } from '@/services/queryKeys';

export function useReceivedReactions(enabled = true) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.reactions.received,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      reactionsApi.getReceivedReactions(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<ReactionReturn>) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled,
  });

  const data = query.data?.pages.flatMap((page) => page.data);

  return {
    ...query,
    data,
    isEmpty: !query.isLoading && !query.isError && (data?.length ?? 0) === 0,
  };
}
