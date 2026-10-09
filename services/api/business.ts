import { z } from 'zod';
import { api } from '@/services/api';
import { validateResponse } from './schemas/common.schema';
import * as s from './schemas/business.schema';

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
