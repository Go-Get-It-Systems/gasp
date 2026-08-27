import { z } from 'zod';

// ─── Workspace ────────────────────────────────────────────────────────────────

export const workspaceResponseSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  followerCount: z.number(),
  followingCount: z.number(),
  isFollowedByViewer: z.boolean().optional(),
});
export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;

// ─── Campaign ─────────────────────────────────────────────────────────────────

export const campaignStateSchema = z.enum(['draft', 'publishing', 'live', 'failed', 'closed']);

export const campaignResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  mediaUrl: z.string(),
  textOverlay: z.string().nullable(),
  isReplayable: z.boolean(),
  state: campaignStateSchema,
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
});
export type CampaignResponse = z.infer<typeof campaignResponseSchema>;

export const createCampaignSchema = z.object({
  title: z.string().min(1).max(100),
  mediaUrl: z.string().url(),
  textOverlay: z.string().max(200).nullable().optional(),
  isReplayable: z.boolean().optional().default(false),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

// ─── Delivery counts ──────────────────────────────────────────────────────────

export const deliveryCountsSchema = z.object({
  queued: z.number(),
  delivered: z.number(),
  failed: z.number(),
  opened: z.number(),
  viewed: z.number(),
});
export type DeliveryCountsResponse = z.infer<typeof deliveryCountsSchema>;

// ─── Studio overview ──────────────────────────────────────────────────────────

export const studioOverviewSchema = z.object({
  workspace: workspaceResponseSchema,
  latestCampaign: campaignResponseSchema.nullable(),
  deliveryCounts: deliveryCountsSchema.nullable(),
});
export type StudioOverviewResponse = z.infer<typeof studioOverviewSchema>;

// ─── Metrics (per-campaign breakdown) ─────────────────────────────────────────

export const campaignMetricSchema = z.object({
  campaignId: z.string(),
  title: z.string(),
  state: campaignStateSchema,
  publishedAt: z.string().nullable(),
  queued: z.number(),
  delivered: z.number(),
  failed: z.number(),
  opened: z.number(),
  viewed: z.number(),
  engagementRate: z.number(),    // viewed / max(delivered, 1) × 100
  deliveryRate: z.number(),      // delivered / max(queued, 1) × 100
});
export type CampaignMetric = z.infer<typeof campaignMetricSchema>;

export const metricsResponseSchema = z.object({
  workspaceId: z.string(),
  totalCampaigns: z.number(),
  totalDelivered: z.number(),
  totalOpened: z.number(),
  totalViewed: z.number(),
  avgEngagementRate: z.number(),
  campaigns: z.array(campaignMetricSchema),
});
export type MetricsResponse = z.infer<typeof metricsResponseSchema>;

// ─── Follow status ────────────────────────────────────────────────────────────

export const followStatusSchema = z.object({
  isFollowing: z.boolean(),
  followedAt: z.string().nullable(),
});
export type FollowStatusResponse = z.infer<typeof followStatusSchema>;

// ─── Campaign reactions (public view) ─────────────────────────────────────────

export const campaignReactionItemSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  campaignTitle: z.string(),
  reactorId: z.string(),
  reactorDisplayName: z.string(),
  reactorAvatarUrl: z.string().nullable(),
  videoUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type CampaignReactionItem = z.infer<typeof campaignReactionItemSchema>;

export const campaignReactionsResponseSchema = z.object({
  workspaceId: z.string(),
  total: z.number(),
  reactions: z.array(campaignReactionItemSchema),
});
export type CampaignReactionsResponse = z.infer<typeof campaignReactionsResponseSchema>;

export const submitReactionSchema = z.object({
  campaignId: z.string().min(1),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
});
export type SubmitReactionInput = z.infer<typeof submitReactionSchema>;
