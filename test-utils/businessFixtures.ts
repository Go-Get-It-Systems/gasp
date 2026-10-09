import { BusinessCampaignSchema, BusinessWorkspaceSchema, OwnCampaignReactionSchema } from '@/services/api/schemas/business.schema';

export const businessWorkspace = BusinessWorkspaceSchema.parse({
  id: 'workspace-1', handle: 'test-business', displayName: 'Pilot business', avatarUrl: null, bio: 'Pilot',
  verificationStatus: 'verified', isVerified: true, followerCount: 2, isFollowing: false,
});
export const businessCampaign = BusinessCampaignSchema.parse({
  id: 'campaign-1', workspaceId: 'workspace-1', ownerUserId: 'owner-1', title: 'Pilot campaign',
  mediaUrl: 'https://storage.googleapis.com/pilot/gasps/owner-1/image.jpg', mediaType: 'image', blurhash: null,
  textOverlay: null, replayable: false, state: 'draft', audienceSnapshotCount: 0, publishError: null,
  publishedAt: null, closedAt: null, createdAt: '2026-10-09T00:00:00Z', updatedAt: '2026-10-09T00:00:00Z',
  counts: { queued: 0, delivered: 0, failed: 0, opened: 0, viewed: 0, reacted: 0, selected: 0 },
  metrics: { deliveryRate: 0, openRate: 0, viewRate: 0, reactionRate: 0 },
});
export const campaignReaction = OwnCampaignReactionSchema.parse({
  id: 'reaction-1', campaignId: 'campaign-1', reactorId: 'actor-1',
  videoUrl: 'https://storage.googleapis.com/pilot/reactions/actor-1/video.mp4', thumbnailUrl: null,
  consentToFeature: false, consentAt: null, isPinned: false, pinnedAt: null,
  createdAt: '2026-10-09T00:00:00Z', updatedAt: '2026-10-09T00:00:00Z',
});
