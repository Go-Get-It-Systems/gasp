import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
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
  const focused = useIsFocused();
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
      // A read started before this write must not overwrite its optimistic state.
      await client.cancelQueries({ queryKey: key, exact: true });
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
  const refreshState = useRef({ active, accessDenied, error: query.error });
  refreshState.current = { active, accessDenied, error: query.error };
  const { refetch } = query;
  useEffect(() => {
    if (!focused || !actor || !workspaceId || !campaignId) return;
    let foreground = AppState.currentState === 'active';
    const refresh = () => {
      const state = refreshState.current;
      const readStatus = (state.error as { response?: { status?: number } } | null)?.response?.status;
      if (!foreground || inFlight.current || !state.active() || state.accessDenied
        || readStatus === 401 || readStatus === 403 || readStatus === 404) return;
      void refetch({ cancelRefetch: false });
    };
    refresh();
    const timer = setInterval(refresh, 5_000);
    const subscription = AppState.addEventListener('change', (next) => {
      const wasForeground = foreground;
      foreground = next === 'active';
      if (foreground && !wasForeground) refresh();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [actor, workspaceId, campaignId, generation, focused, refetch]);
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
