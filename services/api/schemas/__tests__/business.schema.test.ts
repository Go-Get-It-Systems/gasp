import { BusinessCampaignSchema, BusinessWorkspaceSchema, CampaignReactionPageSchema } from '../business.schema';

describe('Business Studio API schemas', () => {
  it('accepts the privacy-safe business workspace contract', () => {
    expect(BusinessWorkspaceSchema.safeParse({ id: 'workspace-1', handle: 'gasp-demo', displayName: 'GASP Demo', avatarUrl: null, bio: 'Demo', verificationStatus: 'verified', role: 'owner' }).success).toBe(true);
  });

  it('rejects an invalid campaign lifecycle state', () => {
    expect(BusinessCampaignSchema.safeParse({ id: 'campaign-1', workspaceId: 'workspace-1', ownerUserId: 'owner-1', title: 'Launch', mediaUrl: 'https://example.com/a.jpg', mediaType: 'image', blurhash: null, textOverlay: null, replayable: false, state: 'sent', audienceSnapshotCount: 20, createdAt: '2026-08-14T00:00:00.000Z', publishedAt: null }).success).toBe(false);
  });

  it('keeps reaction payloads limited to approved actor fields', () => {
    const parsed = CampaignReactionPageSchema.parse({ data: [{ id: 'reaction-1', videoUrl: 'https://example.com/reaction.mp4', createdAt: '2026-08-14T00:00:00.000Z', actor: { id: 'user-1', displayName: 'Ava', avatarUrl: null }, selected: false }], nextCursor: null, hasMore: false });
    expect(Object.keys(parsed.data[0]!.actor).sort()).toEqual(['avatarUrl', 'displayName', 'id']);
  });
});
