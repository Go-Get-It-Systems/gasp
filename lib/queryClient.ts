import { QueryClient, hashKey } from '@tanstack/react-query';
import { getSessionGeneration } from '@/services/session';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: (key) => hashKey([getSessionGeneration(), key]),
      staleTime: 30_000,
      gcTime: 300_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
