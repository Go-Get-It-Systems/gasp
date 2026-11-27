import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { getCampaignLikes, setCampaignLike } from '@/services/api/business';
import { queryKeys } from '@/services/queryKeys';
import { assertCurrentSession, getSessionGeneration } from '@/services/session';
import { useAuthStore } from '@/stores/authStore';
import { useBusinessActor } from './useBusiness';

export function useCampaignLikes(workspaceId: string, campaignId: string) {
  const actor = useBusinessActor();
  const generation = getSessionGeneration();
  const client = useQueryClient();
  const key = [...queryKeys.business.campaign(actor, workspaceId, campaignId, 'likes'), generation];
  const active = () => getSessionGeneration() === generation && useAuthStore.getState().user?.id === actor;
  const inFlight = useRef(false);
  const query = useQuery({
    queryKey: key, enabled: !!actor && !!workspaceId && !!campaignId, retry: false,
    queryFn: async () => {
      assertCurrentSession(generation);
      const result = await getCampaignLikes(workspaceId, campaignId);
      assertCurrentSession(generation);
      return result;
    },
  });
  const mutation = useMutation({
    mutationKey: key, retry: false,
    mutationFn: async (liked: boolean) => {
      assertCurrentSession(generation);
      const result = await setCampaignLike(workspaceId, campaignId, liked);
      assertCurrentSession(generation);
      return result;
    },
    onSuccess: async (result) => {
      if (!active()) return;
      await client.cancelQueries({ queryKey: key, exact: true });
      if (active()) client.setQueryData(key, result);
    },
    onError: (error) => { if (active()) Sentry.captureException(error, { tags: { feature: 'campaign-like' } }); },
    onSettled: () => { inFlight.current = false; },
  });
  function save(liked: boolean) {
    if (!active() || !query.data || query.isError || inFlight.current || accessDenied) return;
    inFlight.current = true;
    mutation.mutate(liked);
  }
  const data = query.data;
  const optimistic = mutation.isPending && data && mutation.variables !== undefined;
  const liked = optimistic ? mutation.variables : data?.liked ?? false;
  const count = Math.max(0, (data?.count ?? 0) + (optimistic ? Number(mutation.variables) - Number(data.liked) : 0));
  const status = (mutation.error as { response?: { status?: number } } | null)?.response?.status;
  const accessDenied = status === 401 || status === 403 || status === 404;
  return {
    liked, count, hasData: !!data && !query.isError, isLoading: query.isPending, isPending: mutation.isPending,
    isError: query.isError || mutation.isError, accessDenied,
    disabled: !actor || !data || query.isError || mutation.isPending || accessDenied,
    toggle: () => save(!liked),
    retry: () => {
      if (query.isError || accessDenied) {
        void query.refetch().then((result) => { if (active() && !result.isError) mutation.reset(); });
      }
      else if (mutation.variables !== undefined) save(mutation.variables);
    },
  };
}
