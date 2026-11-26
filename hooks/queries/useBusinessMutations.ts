import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import * as api from '@/services/api/business';
import { queryKeys } from '@/services/queryKeys';
import type { CampaignInput, CampaignReactionInput } from '@/services/api/schemas/business.schema';
import { useBusinessActor } from './useBusiness';

export function useBusinessMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const actor = useBusinessActor();
  const client = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.business.actor(actor), mutationFn,
    onError: (error) => Sentry.captureException(error, { tags: { feature: 'business' } }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.business.actor(actor) }),
  });
}
export const useBusinessFollow = (w: string) => useBusinessMutation((following: boolean) => api.setBusinessFollow(w, following));
export const useSaveCampaign = (w: string, c?: string) => useBusinessMutation((input: CampaignInput) =>
  c ? api.updateBusinessCampaign(w, c, input) : api.createBusinessCampaign(w, input));
export const useCampaignAction = (w: string, c: string) => useBusinessMutation((action: 'publish' | 'close' | 'delete') => {
  if (action === 'publish') return api.publishBusinessCampaign(w, c);
  if (action === 'close') return api.closeBusinessCampaign(w, c);
  return api.deleteBusinessCampaign(w, c);
});
export const useCampaignDelivery = (w: string, c: string) => useBusinessMutation((status: 'opened' | 'viewed') => api.markCampaignDelivery(w, c, status));
export const useCampaignConsent = (w: string, c: string) => useBusinessMutation((consent: boolean) => api.setCampaignReactionConsent(w, c, consent));
export const useReactionPin = (w: string, c: string) => useBusinessMutation((input: { id: string; pinned: boolean }) => api.setReactionPin(w, c, input.id, input.pinned));
export function useSubmitCampaignReaction(w: string, c: string) {
  return useBusinessMutation((input: CampaignReactionInput) => api.submitCampaignReaction(w, c, input));
}
