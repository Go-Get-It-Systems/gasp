import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import { createBusinessCampaign, getBusinessCampaign, publishBusinessCampaign } from '@/services/api/business';
import type { BusinessCampaign } from '@/services/api/schemas/business.schema';
import { queryKeys } from '@/services/queryKeys';
import { uploadWithRetry } from '@/services/uploadQueue';
import { useAuthStore } from '@/stores/authStore';
import { useBusinessStore } from '@/stores/businessStore';
import { useBusinessMedia } from '@/hooks/useBusinessMedia';
import { useBusinessActor, useBusinessWorkspaces } from './useBusiness';

export function useCampaignPublishing(params: { workspaceId?: string; mediaUri?: string; isVideo?: string }) {
  const { t } = useTranslation();
  const actor = useBusinessActor();
  const client = useQueryClient();
  const workspaces = useBusinessWorkspaces();
  const activeWorkspaceId = useBusinessStore((state) => state.activeWorkspace?.id);
  const picker = useBusinessMedia();
  const [title, setTitle] = useState('');
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const savedDraft = useRef<{ signature: string; campaignId: string } | null>(null);
  const locked = useRef(false);
  const requestedId = params.workspaceId?.trim();
  const owned = workspaces.data ?? [];
  // Cached UI state never grants ownership. Resolve only from the owner API.
  const workspace = requestedId ? owned.find((row) => row.id === requestedId)
    : owned.find((row) => row.id === activeWorkspaceId) ?? owned[0];
  const media = picker.media ?? (params.mediaUri ? {
    uri: params.mediaUri, mediaType: params.isVideo === 'true' ? 'video' as const : 'image' as const,
  } : undefined);

  const mutation = useMutation({
    mutationKey: queryKeys.business.actor(actor),
    retry: 0,
    mutationFn: async () => {
      const assertSession = () => {
        const user = useAuthStore.getState().user;
        if (!actor || user?.id !== actor || user.accountType !== 'business') throw new Error(t('business.error'));
      };
      assertSession();
      if (!workspace || workspaces.isError) throw new Error(t('business.workspaceUnavailable'));
      if (!media || !title.trim() || title.trim().length > 100) throw new Error(t('business.invalidCampaign'));
      const signature = JSON.stringify([actor, workspace.id, media.uri, media.mediaType, title.trim()]);
      const saved = savedDraft.current?.signature === signature ? savedDraft.current : null;
      let campaign: BusinessCampaign;
      if (saved) {
        setUploadStep('saving');
        campaign = await getBusinessCampaign(workspace.id, saved.campaignId);
        assertSession();
        if (campaign.state === 'live' || campaign.state === 'publishing') return campaign;
        if (campaign.state !== 'draft' && campaign.state !== 'failed') throw new Error(t('business.unavailable'));
      } else {
        setUploadStep('uploading');
        // Actor-owned uploads work for every permitted workspace, including on web.
        const upload = await uploadWithRetry(media.uri, 'gasps', actor);
        assertSession();
        setUploadStep('saving');
        campaign = await createBusinessCampaign(workspace.id, {
          title: title.trim(), mediaUrl: upload.downloadUrl, mediaType: media.mediaType, replayable: false,
        });
        // A failed publication retries this draft instead of creating another one.
        savedDraft.current = { signature, campaignId: campaign.id };
      }
      assertSession();
      const publication = await publishBusinessCampaign(workspace.id, campaign.id);
      if (publication.state !== 'live' && publication.state !== 'publishing') throw new Error(t('business.publishErrorRetry'));
      return publication;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.business.actor(actor) }),
    onError: (error) => Sentry.captureException(error, { tags: { feature: 'business-campaign-publishing' } }),
    onSettled: () => { setUploadStep('idle'); locked.current = false; },
  });
  const published = mutation.isSuccess ? mutation.data : null;
  const canPublish = !!media && !!title.trim() && title.trim().length <= 100 && !!workspace
    && !workspaces.isError && !picker.picking && !mutation.isPending && !published;
  const publish = () => {
    if (!canPublish || locked.current) return;
    locked.current = true;
    mutation.mutate();
  };
  return {
    title, setTitle, media, published, uploadStep, canPublish, publish, workspaces, workspace,
    isPending: mutation.isPending, isError: mutation.isError, picking: picker.picking,
    pickMedia: () => { if (!mutation.isPending && !locked.current) void picker.pick(); },
  };
}
