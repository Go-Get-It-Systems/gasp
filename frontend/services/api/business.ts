import { api } from '@/services/api';
import { z } from 'zod';

// ─── Schemas ────────────────────────────────────────────────────────────────

export const BusinessWorkspaceSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  followerCount: z.number(),
  followingCount: z.number().default(0),
  isFollowedByViewer: z.boolean().optional(),
});
export type BusinessWorkspace = z.infer<typeof BusinessWorkspaceSchema>;

export const CampaignStateSchema = z.enum([
  'draft',
  'publishing',
  'live',
  'failed',
  'closed',
]);
export type CampaignState = z.infer<typeof CampaignStateSchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  mediaUrl: z.string(),
  textOverlay: z.string().nullable(),
  isReplayable: z.boolean(),
  state: CampaignStateSchema,
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const CampaignDeliveryCountsSchema = z.object({
  queued: z.number(),
  delivered: z.number(),
  failed: z.number(),
  opened: z.number(),
  viewed: z.number(),
});
export type CampaignDeliveryCounts = z.infer<typeof CampaignDeliveryCountsSchema>;

export const StudioOverviewSchema = z.object({
  workspace: BusinessWorkspaceSchema,
  latestCampaign: CampaignSchema.nullable(),
  deliveryCounts: CampaignDeliveryCountsSchema.nullable(),
});
export type StudioOverview = z.infer<typeof StudioOverviewSchema>;

export const CreateCampaignInputSchema = z.object({
  title: z.string().min(1).max(100),
  mediaUrl: z.string().url(),
  textOverlay: z.string().max(200).nullable().optional(),
  isReplayable: z.boolean().optional(),
});
export type CreateCampaignInput = z.infer<typeof CreateCampaignInputSchema>;

// ─── Metrics ────────────────────────────────────────────────────────────────

export const CampaignMetricSchema = z.object({
  campaignId: z.string(),
  title: z.string(),
  state: CampaignStateSchema,
  publishedAt: z.string().nullable(),
  queued: z.number(),
  delivered: z.number(),
  failed: z.number(),
  opened: z.number(),
  viewed: z.number(),
  engagementRate: z.number(),
  deliveryRate: z.number(),
});
export type CampaignMetric = z.infer<typeof CampaignMetricSchema>;

export const MetricsResponseSchema = z.object({
  workspaceId: z.string(),
  totalCampaigns: z.number(),
  totalDelivered: z.number(),
  totalOpened: z.number(),
  totalViewed: z.number(),
  avgEngagementRate: z.number(),
  campaigns: z.array(CampaignMetricSchema),
});
export type MetricsResponse = z.infer<typeof MetricsResponseSchema>;

// ─── Campaign Reactions ──────────────────────────────────────────────────────

export const CampaignReactionItemSchema = z.object({
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
export type CampaignReactionItem = z.infer<typeof CampaignReactionItemSchema>;

export const CampaignReactionsResponseSchema = z.object({
  workspaceId: z.string(),
  total: z.number(),
  reactions: z.array(CampaignReactionItemSchema),
});
export type CampaignReactionsResponse = z.infer<typeof CampaignReactionsResponseSchema>;

// ─── API calls ──────────────────────────────────────────────────────────────

/** Returns the active owner membership. Throws 404 if the user has no workspace. */
export async function getMyBusinesses(): Promise<BusinessWorkspace[]> {
  const res = await api.get<BusinessWorkspace[]>('/businesses/mine');
  return res.data;
}

/** Public profile by handle (consumer-safe). */
export async function getBusinessByHandle(handle: string): Promise<BusinessWorkspace> {
  const res = await api.get<BusinessWorkspace>(`/businesses/${handle}`);
  return res.data;
}

/** Studio overview: active/latest campaign + aggregate delivery counts. */
export async function getStudioOverview(workspaceId: string): Promise<StudioOverview> {
  const res = await api.get<StudioOverview>(`/businesses/${workspaceId}/overview`);
  return res.data;
}

/** Follow a workspace (idempotent). */
export async function followBusiness(workspaceId: string): Promise<void> {
  await api.post(`/businesses/${workspaceId}/follow`);
}

/** Unfollow a workspace (idempotent). */
export async function unfollowBusiness(workspaceId: string): Promise<void> {
  await api.delete(`/businesses/${workspaceId}/follow`);
}

/** List campaigns for a workspace. */
export async function getCampaigns(workspaceId: string): Promise<Campaign[]> {
  const res = await api.get<Campaign[]>(`/businesses/${workspaceId}/campaigns`);
  return res.data;
}

/** Public list of live/closed campaigns — accessible to all authenticated users. */
export async function getPublicCampaigns(workspaceId: string): Promise<Campaign[]> {
  const res = await api.get<Campaign[]>(`/businesses/${workspaceId}/campaigns/public`);
  return res.data;
}

/** Get single campaign detail. */
export async function getCampaign(workspaceId: string, campaignId: string): Promise<Campaign> {
  const res = await api.get<Campaign>(`/businesses/${workspaceId}/campaigns/${campaignId}`);
  return res.data;
}

/** Create a campaign draft. */
export async function createCampaign(
  workspaceId: string,
  input: CreateCampaignInput,
): Promise<Campaign> {
  const res = await api.post<Campaign>(`/businesses/${workspaceId}/campaigns`, input);
  return res.data;
}

/** Update a draft campaign. */
export async function updateCampaign(
  workspaceId: string,
  campaignId: string,
  input: Partial<CreateCampaignInput>,
): Promise<Campaign> {
  const res = await api.patch<Campaign>(
    `/businesses/${workspaceId}/campaigns/${campaignId}`,
    input,
  );
  return res.data;
}

/**
 * Publish a campaign. The backend confirms live state asynchronously.
 * The client must poll getCampaign until state === 'live' | 'failed'.
 */
export async function publishCampaign(workspaceId: string, campaignId: string): Promise<void> {
  await api.post(`/businesses/${workspaceId}/campaigns/${campaignId}/publish`);
}

/** Workspace metrics: per-campaign breakdown + aggregate totals. R5.1 */
export async function getMetrics(workspaceId: string): Promise<MetricsResponse> {
  const res = await api.get<MetricsResponse>(`/businesses/${workspaceId}/metrics`);
  return res.data;
}

/** Check follow status for the current user. */
export async function getFollowStatus(workspaceId: string): Promise<{ isFollowing: boolean; followedAt: string | null }> {
  const res = await api.get(`/businesses/${workspaceId}/follow`);
  return res.data;
}

/** Get all campaign reaction videos for a workspace. */
export async function getCampaignReactions(workspaceId: string): Promise<CampaignReactionsResponse> {
  const res = await api.get<CampaignReactionsResponse>(`/businesses/${workspaceId}/reactions`);
  return res.data;
}

/** Submit a reaction video to a campaign (followers only). */
export async function submitCampaignReaction(
  workspaceId: string,
  input: { campaignId: string; videoUrl: string; thumbnailUrl?: string },
): Promise<void> {
  await api.post(`/businesses/${workspaceId}/reactions`, input);
}

/**
 * Follow a business by username/handle.
 * Resolves the workspaceId internally — use this when you only have the user's username.
 */
export async function followBusinessByHandle(handle: string): Promise<void> {
  const workspace = await getBusinessByHandle(handle);
  await followBusiness(workspace.id);
}

/**
 * Unfollow a business by username/handle.
 */
export async function unfollowBusinessByHandle(handle: string): Promise<void> {
  const workspace = await getBusinessByHandle(handle);
  await unfollowBusiness(workspace.id);
}
