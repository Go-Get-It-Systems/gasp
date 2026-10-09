import { z } from 'zod';
import { ApiGaspSchema } from './gasp.schema';
import { PaginatedResponseSchema } from './common.schema';

const id = z.string().min(1);
const count = z.number().int().nonnegative();
export const BusinessWorkspaceSchema = z.object({
  id, handle: id, displayName: id, avatarUrl: z.string().nullable(), bio: z.string().nullable(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']), isVerified: z.boolean(),
  followerCount: count, isFollowing: z.boolean(),
});
export const BusinessOwnerSchema = BusinessWorkspaceSchema.extend({ role: z.literal('owner') });
export const CampaignCountsSchema = z.object({
  queued: count, delivered: count, failed: count, opened: count, viewed: count, reacted: count, selected: count,
});
export const CampaignRatesSchema = z.object({
  deliveryRate: z.number().nonnegative(), openRate: z.number().nonnegative(),
  viewRate: z.number().nonnegative(), reactionRate: z.number().nonnegative(),
});
export const PublicCampaignSchema = z.object({
  id, workspaceId: id, title: id, mediaUrl: z.string().url(), mediaType: z.enum(['image', 'video']),
  textOverlay: z.string().nullable(), replayable: z.boolean(),
  state: z.enum(['draft', 'publishing', 'live', 'failed', 'closed']), publishedAt: z.string().nullable(),
});
export const BusinessCampaignSchema = PublicCampaignSchema.extend({
  ownerUserId: id, blurhash: z.string().nullable(), audienceSnapshotCount: count,
  publishError: z.string().nullable(), closedAt: z.string().nullable(), createdAt: id, updatedAt: id,
  counts: CampaignCountsSchema, metrics: CampaignRatesSchema,
});
export const CampaignInputSchema = z.object({
  title: z.string().trim().min(1).max(120), mediaUrl: z.string().url(), mediaType: z.enum(['image', 'video']),
  blurhash: z.string().max(100).optional(), textOverlay: z.string().max(5000).optional(), replayable: z.boolean().optional(),
});
export const BusinessOverviewSchema = z.object({
  followerCount: count, campaignCount: count, publishedCount: count, activeCampaign: BusinessCampaignSchema.nullable(),
});
export const CampaignMetricsSchema = z.object({ counts: CampaignCountsSchema, metrics: CampaignRatesSchema, audienceSnapshotCount: count });
export const OwnCampaignReactionSchema = z.object({
  id, campaignId: id, reactorId: id, videoUrl: z.string().url(), thumbnailUrl: z.string().nullable(),
  consentToFeature: z.boolean(), consentAt: z.string().nullable(), isPinned: z.boolean(), pinnedAt: z.string().nullable(),
  createdAt: id, updatedAt: id,
});
const actor = z.object({ id, displayName: id, avatarUrl: z.string().nullable() });
export const OwnerCampaignReactionSchema = OwnCampaignReactionSchema.extend({ actor });
export const PublicCampaignReactionSchema = OwnCampaignReactionSchema.pick({
  id: true, campaignId: true, videoUrl: true, thumbnailUrl: true, isPinned: true, createdAt: true,
}).extend({ actor });
export const CampaignReactionInputSchema = z.object({
  videoUrl: z.string().url(), thumbnailUrl: z.string().url().optional(), consentToFeature: z.boolean(),
});
export const CampaignInboxSchema = ApiGaspSchema.extend({
  campaignId: id, workspaceId: id, handle: id, senderName: id, senderAvatarUrl: z.string().nullable(),
});
export const CampaignReferenceSchema = z.object({ workspaceId: id, campaignId: id });
export const MyCampaignReactionSchema = OwnCampaignReactionSchema.extend({ workspaceId: id, campaignTitle: id });
export const MyCampaignReactionsPageSchema = PaginatedResponseSchema(MyCampaignReactionSchema);
export type BusinessWorkspace = z.infer<typeof BusinessWorkspaceSchema>;
export type BusinessOwner = z.infer<typeof BusinessOwnerSchema>;
export type BusinessCampaign = z.infer<typeof BusinessCampaignSchema>;
export type PublicCampaign = z.infer<typeof PublicCampaignSchema>;
export type CampaignInput = z.infer<typeof CampaignInputSchema>;
export type CampaignReactionInput = z.infer<typeof CampaignReactionInputSchema>;
export type OwnCampaignReaction = z.infer<typeof OwnCampaignReactionSchema>;
export type OwnerCampaignReaction = z.infer<typeof OwnerCampaignReactionSchema>;
export type PublicCampaignReaction = z.infer<typeof PublicCampaignReactionSchema>;
export type CampaignReference = z.infer<typeof CampaignReferenceSchema>;
export type CampaignInboxItem = z.infer<typeof CampaignInboxSchema>;
export type MyCampaignReaction = z.infer<typeof MyCampaignReactionSchema>;
