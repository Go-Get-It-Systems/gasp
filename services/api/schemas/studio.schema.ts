import { z } from 'zod';
import { BusinessWorkspaceSchema, BusinessCampaignSchema, CampaignCountsSchema } from './business.schema';

export const StudioWorkspaceSchema = BusinessWorkspaceSchema.extend({
  isActive: z.boolean(),
  followingCount: z.number().int().nonnegative().optional(),
});
export const StudioCampaignSchema = BusinessCampaignSchema.extend({ isReplayable: z.boolean() });
export const StudioOverviewSchema = z.object({
  workspace: StudioWorkspaceSchema,
  latestCampaign: StudioCampaignSchema.nullable(),
  deliveryCounts: CampaignCountsSchema.nullable(),
});
export const CampaignMetricSchema = z.object({
  campaignId: z.string(), title: z.string(), state: BusinessCampaignSchema.shape.state,
  publishedAt: z.string().nullable(), queued: z.number().nonnegative(),
  delivered: z.number().nonnegative(), failed: z.number().nonnegative(),
  opened: z.number().nonnegative(), viewed: z.number().nonnegative(),
  engagementRate: z.number().nonnegative(), deliveryRate: z.number().nonnegative(),
});
export const MetricsResponseSchema = z.object({
  workspaceId: z.string(), totalCampaigns: z.number().int().nonnegative(),
  totalDelivered: z.number().nonnegative(), totalOpened: z.number().nonnegative(),
  totalViewed: z.number().nonnegative(), avgEngagementRate: z.number().nonnegative(),
  campaigns: z.array(CampaignMetricSchema),
});
export const CampaignReactionItemSchema = z.object({
  id: z.string(), campaignId: z.string(), campaignTitle: z.string(),
  campaignMediaUrl: z.string().nullable(), campaignMediaType: z.enum(['image', 'video']),
  reactorId: z.string(), reactorDisplayName: z.string(), reactorAvatarUrl: z.string().nullable(),
  videoUrl: z.string(), thumbnailUrl: z.string().nullable(), createdAt: z.string(),
  consentToFeature: z.boolean(), isPinned: z.boolean(), pinnedAt: z.string().nullable(),
});
export const CampaignReactionsResponseSchema = z.object({
  workspaceId: z.string(), total: z.number().int().nonnegative(), reactions: z.array(CampaignReactionItemSchema),
});
export const PinnedReactionsResponseSchema = z.object({
  workspaceId: z.string(), pinned: z.array(CampaignReactionItemSchema),
});
export type StudioWorkspace = z.infer<typeof StudioWorkspaceSchema>;
export type StudioCampaign = z.infer<typeof StudioCampaignSchema>;
export type CampaignMetric = z.infer<typeof CampaignMetricSchema>;
export type MetricsResponse = z.infer<typeof MetricsResponseSchema>;
export type CampaignReactionItem = z.infer<typeof CampaignReactionItemSchema>;
