import { BusinessCampaignSchema, CampaignReactionInputSchema, PublicCampaignReactionSchema, CampaignInboxSchema } from '../business.schema';
import { businessCampaign, campaignReaction } from '@/test-utils/businessFixtures';
import { normalizeGasp } from '../gasp.schema';

describe('Business contracts', () => {
  it('requires a fresh explicit consent boolean, never a default', () => {
    expect(CampaignReactionInputSchema.safeParse({ videoUrl: campaignReaction.videoUrl }).success).toBe(false);
    expect(CampaignReactionInputSchema.parse({ videoUrl: campaignReaction.videoUrl, consentToFeature: false }).consentToFeature).toBe(false);
    expect(CampaignReactionInputSchema.parse({ videoUrl: campaignReaction.videoUrl, consentToFeature: true }).consentToFeature).toBe(true);
  });
  it('validates expanded owner metrics without assuming fabricated counts', () => {
    expect(BusinessCampaignSchema.parse(businessCampaign).metrics.viewRate).toBe(0);
    expect(BusinessCampaignSchema.safeParse({ ...businessCampaign, counts: { ...businessCampaign.counts, delivered: -1 } }).success).toBe(false);
    expect(BusinessCampaignSchema.safeParse({ ...businessCampaign, state: 'unknown' }).success).toBe(false);
  });
  it('strips private reaction identifiers and consent timestamps from public models', () => {
    const publicReaction = PublicCampaignReactionSchema.parse({ ...campaignReaction, actor: { id: 'actor-1', displayName: 'Actor', avatarUrl: null } });
    expect(publicReaction).not.toHaveProperty('reactorId');
    expect(publicReaction).not.toHaveProperty('consentAt');
  });
  it('preserves campaign identity across socket normalization', () => {
    const gasp = CampaignInboxSchema.parse({ id: 'gasp-1', campaignId: businessCampaign.id, workspaceId: businessCampaign.workspaceId,
      handle: 'pilot', senderName: 'Pilot', senderAvatarUrl: null, senderId: 'owner-1', recipientId: 'actor-1', imageUrl: businessCampaign.mediaUrl,
      mediaType: 'image', blurhash: null, status: 'pending', expiresAt: '2026-10-10T00:00:00Z', createdAt: '2026-10-09T00:00:00Z' });
    expect(normalizeGasp(gasp).campaignId).toBe(businessCampaign.id);
  });
});
