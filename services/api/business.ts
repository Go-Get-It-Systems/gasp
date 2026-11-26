import { z } from 'zod';
import { api } from '@/services/api';
import { validateResponse } from './schemas/common.schema';
import * as s from './schemas/business.schema';
import * as studio from './schemas/studio.schema';

export type { StudioCampaign as Campaign, CampaignMetric, CampaignReactionItem, MetricsResponse } from './schemas/studio.schema';

// Unlike legacy adapters, business contracts fail closed after logging validation errors.
async function request<T>(schema: z.ZodType<T>, path: string, method = 'get', data?: unknown): Promise<T> {
  const response = await api.request({ url: `/businesses${path}`, method, data });
  return schema.parse(validateResponse(schema, response.data, `business:${method}:${path}`, false));
}
const segment = (value: string) => encodeURIComponent(value);
const workspace = (id: string) => `/${segment(id)}`;
const campaign = (w: string, c: string) => `${workspace(w)}/campaigns/${segment(c)}`;
export const getBusinessWorkspaces = () => request(z.array(s.BusinessOwnerSchema), '/workspaces');
export const getBusinessDirectory = () => request(z.array(s.BusinessWorkspaceSchema), '/directory');
export const getCampaignInbox = () => request(z.array(s.CampaignInboxSchema), '/inbox');
export const getMyCampaignReactions = (cursor?: string) => request(s.MyCampaignReactionsPageSchema, `/reactions/mine${cursor ? `?cursor=${segment(cursor)}` : ''}`);
export const getBusinessProfile = (handle: string) => request(s.BusinessWorkspaceSchema, `/${segment(handle)}`);
export const getBusinessOverview = (w: string) => request(s.BusinessOverviewSchema, `${workspace(w)}/overview`);
export const getBusinessCampaigns = (w: string) => request(z.array(s.BusinessCampaignSchema), `${workspace(w)}/campaigns`);
export const getPublicCampaigns = (w: string) => request(z.array(s.PublicCampaignSchema), `${workspace(w)}/campaigns/public`);
export const getBusinessCampaign = (w: string, c: string) => request(s.BusinessCampaignSchema, campaign(w, c));
export const getCampaignMetrics = (w: string, c: string) => request(s.CampaignMetricsSchema, `${campaign(w, c)}/metrics`);
export const getOwnerReactions = (w: string, c: string, selected: boolean) =>
  request(z.array(s.OwnerCampaignReactionSchema), `${campaign(w, c)}/reactions?limit=100&filter=${selected ? 'selected' : 'newest'}`);
export const getPublicReactions = (w: string, pinned = false) =>
  request(z.array(s.PublicCampaignReactionSchema), `${workspace(w)}/reactions${pinned ? '/pinned' : ''}`);
export const getMyCampaignReaction = (w: string, c: string) => request(s.OwnCampaignReactionSchema.nullable(), `${campaign(w, c)}/reactions/mine`);
export const setBusinessFollow = (w: string, following: boolean) =>
  request(z.object({ following: z.boolean() }), `${workspace(w)}/follow`, following ? 'post' : 'delete');
export const createBusinessCampaign = (w: string, input: s.CampaignInput) =>
  request(s.BusinessCampaignSchema, `${workspace(w)}/campaigns`, 'post', s.CampaignInputSchema.parse(input));
export const updateBusinessCampaign = (w: string, c: string, input: Partial<s.CampaignInput>) =>
  request(s.BusinessCampaignSchema, campaign(w, c), 'patch', s.CampaignInputSchema.partial().parse(input));
export const deleteBusinessCampaign = (w: string, c: string) => request(z.object({ deleted: z.literal(true) }), campaign(w, c), 'delete');
export const publishBusinessCampaign = (w: string, c: string) => request(s.BusinessCampaignSchema, `${campaign(w, c)}/publish`, 'post');
export const closeBusinessCampaign = (w: string, c: string) => request(s.BusinessCampaignSchema, `${campaign(w, c)}/close`, 'post');
export const markCampaignDelivery = (w: string, c: string, status: 'opened' | 'viewed') =>
  request(z.object({ recorded: z.literal(true) }), `${campaign(w, c)}/delivery`, 'post', { status });
export const submitCampaignReaction = (w: string, c: string, input: s.CampaignReactionInput) =>
  request(s.OwnCampaignReactionSchema, `${campaign(w, c)}/reactions`, 'post', s.CampaignReactionInputSchema.parse(input));
export const setCampaignReactionConsent = (w: string, c: string, consentToFeature: boolean) =>
  request(s.OwnCampaignReactionSchema, `${campaign(w, c)}/reactions/mine/consent`, 'patch', { consentToFeature });
export const setReactionPin = (w: string, c: string, r: string, pinned: boolean) =>
  request(z.object({ selected: z.boolean() }), `${campaign(w, c)}/reactions/${segment(r)}/selection`, pinned ? 'put' : 'delete');

// Compatibility for the original Studio screen. Keep its presentation intact
// while using the current, validated owner endpoints and consent enforcement.
export async function getMyBusinesses() {
  const rows = await getBusinessWorkspaces();
  return rows.map((row, index) => studio.StudioWorkspaceSchema.parse({ ...row, isActive: index === 0 }));
}

export async function getCampaigns(workspaceId: string) {
  const rows = await getBusinessCampaigns(workspaceId);
  return rows.map((row) => studio.StudioCampaignSchema.parse({ ...row, isReplayable: row.replayable }));
}

export async function getStudioOverview(workspaceId: string) {
  const [workspaces, overview, campaigns] = await Promise.all([
    getMyBusinesses(), getBusinessOverview(workspaceId), getCampaigns(workspaceId),
  ]);
  const workspace = workspaces.find((row) => row.id === workspaceId);
  if (!workspace) throw new Error('Workspace is not available for this account.');
  const latest = overview.activeCampaign ?? [...campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  return studio.StudioOverviewSchema.parse({
    workspace,
    latestCampaign: latest ? { ...latest, isReplayable: latest.replayable } : null,
    deliveryCounts: latest?.counts ?? null,
  });
}

export async function getMetrics(workspaceId: string) {
  const rows = await getBusinessCampaigns(workspaceId);
  const campaigns = rows.map((row) => ({
    campaignId: row.id, title: row.title, state: row.state, publishedAt: row.publishedAt,
    queued: row.counts.queued, delivered: row.counts.delivered, failed: row.counts.failed,
    opened: row.counts.opened, viewed: row.counts.viewed,
    engagementRate: row.metrics.viewRate, deliveryRate: row.metrics.deliveryRate,
  }));
  const sum = (key: 'delivered' | 'opened' | 'viewed') => campaigns.reduce((total, row) => total + row[key], 0);
  const totalDelivered = sum('delivered');
  const totalViewed = sum('viewed');
  return studio.MetricsResponseSchema.parse({
    workspaceId, totalCampaigns: campaigns.length, totalDelivered, totalOpened: sum('opened'), totalViewed,
    avgEngagementRate: totalDelivered ? Math.min(100, totalViewed / totalDelivered * 100) : 0,
    campaigns,
  });
}

export async function getCampaignReactions(workspaceId: string) {
  const campaigns = await getBusinessCampaigns(workspaceId);
  const groups = await Promise.all(campaigns.map(async (campaign) => {
    const rows = await getOwnerReactions(workspaceId, campaign.id, false);
    return rows.map((row) => ({
      ...row, campaignTitle: campaign.title, campaignMediaUrl: campaign.mediaUrl, campaignMediaType: campaign.mediaType,
      reactorId: row.reactorId, reactorDisplayName: row.actor.displayName, reactorAvatarUrl: row.actor.avatarUrl,
    }));
  }));
  const reactions = groups.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return studio.CampaignReactionsResponseSchema.parse({ workspaceId, total: reactions.length, reactions });
}

export async function getPinnedReactions(workspaceId: string) {
  const { reactions } = await getCampaignReactions(workspaceId);
  return studio.PinnedReactionsResponseSchema.parse({
    workspaceId, pinned: reactions.filter((row) => row.isPinned && row.consentToFeature),
  });
}

async function setStudioReactionPin(workspaceId: string, reactionId: string, pinned: boolean) {
  const { reactions } = await getCampaignReactions(workspaceId);
  const reaction = reactions.find((row) => row.id === reactionId);
  if (!reaction) throw new Error('Reaction is not available for this workspace.');
  return setReactionPin(workspaceId, reaction.campaignId, reaction.id, pinned);
}
export const pinReaction = (workspaceId: string, reactionId: string) => setStudioReactionPin(workspaceId, reactionId, true);
export const unpinReaction = (workspaceId: string, reactionId: string) => setStudioReactionPin(workspaceId, reactionId, false);
export const publishCampaign = publishBusinessCampaign;
export const deleteCampaign = deleteBusinessCampaign;
export async function getCampaignsByHandle(handle: string) {
  const workspace = await getBusinessProfile(handle);
  return getPublicCampaigns(workspace.id);
}
