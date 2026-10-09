import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import * as api from '@/services/api/business';
import { queryKeys } from '@/services/queryKeys';
import { useAuthStore } from '@/stores/authStore';

export const useBusinessActor = () => useAuthStore((s) => s.user?.id ?? '');
export function useBusinessWorkspaces() {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.workspaces(actor), queryFn: api.getBusinessWorkspaces, enabled: !!actor });
}
export function useBusinessDirectory() {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.directory(actor), queryFn: api.getBusinessDirectory, enabled: !!actor });
}
export function useCampaignInbox() {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.inbox(actor), queryFn: api.getCampaignInbox, enabled: !!actor });
}
export function useBusinessProfile(handle: string) {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.profile(actor, handle), queryFn: () => api.getBusinessProfile(handle), enabled: !!actor && !!handle });
}
export function useBusinessOverview(w: string) {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.workspace(actor, w, 'overview'), queryFn: () => api.getBusinessOverview(w), enabled: !!actor && !!w });
}
export function useBusinessCampaigns(w: string) {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.workspace(actor, w, 'campaigns'), queryFn: () => api.getBusinessCampaigns(w), enabled: !!actor && !!w, refetchInterval: 15_000 });
}
export function usePublicCampaigns(w: string) {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.workspace(actor, w, 'publicCampaigns'), queryFn: () => api.getPublicCampaigns(w), enabled: !!actor && !!w });
}
export function useBusinessCampaign(w: string, c: string) {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.campaign(actor, w, c, 'detail'), queryFn: () => api.getBusinessCampaign(w, c), enabled: !!actor && !!w && !!c });
}
export function useCampaignMetrics(w: string, c: string) {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.campaign(actor, w, c, 'metrics'), queryFn: () => api.getCampaignMetrics(w, c), enabled: !!actor && !!w && !!c, refetchInterval: 15_000 });
}
export function useOwnerCampaignReactions(w: string, c: string, selected = false, enabled = true) {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.campaign(actor, w, c, selected ? 'selectedReactions' : 'reactions'), queryFn: () => api.getOwnerReactions(w, c, selected), enabled: enabled && !!actor && !!w && !!c, refetchInterval: 15_000 });
}
export function usePublicCampaignReactions(w: string, pinned = false, enabled = true) {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.workspace(actor, w, pinned ? 'pinnedReactions' : 'publicReactions'), queryFn: () => api.getPublicReactions(w, pinned), enabled: enabled && !!actor && !!w, refetchInterval: 15_000 });
}
export function useMyCampaignReaction(w: string, c: string) {
  const actor = useBusinessActor();
  return useQuery({ queryKey: queryKeys.business.campaign(actor, w, c, 'myReaction'), queryFn: () => api.getMyCampaignReaction(w, c), enabled: !!actor && !!w && !!c });
}
export function useMyCampaignReactions() {
  const actor = useBusinessActor();
  return useInfiniteQuery({ queryKey: queryKeys.business.myReactions(actor),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.getMyCampaignReactions(pageParam),
    getNextPageParam: (page) => page.hasMore ? page.nextCursor ?? undefined : undefined,
    enabled: !!actor,
  });
}
