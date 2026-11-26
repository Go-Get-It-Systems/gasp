import { api } from '@/services/api';
import { getMyBusinesses, getStudioOverview, getMetrics, getPinnedReactions, pinReaction } from '../business';
import { businessWorkspace, businessCampaign, campaignReaction } from '@/test-utils/businessFixtures';

jest.mock('@/services/api', () => ({ api: { request: jest.fn() } }));
const request = api.request as jest.Mock;
let mockCampaigns = [businessCampaign];
let mockWorkspaces = [{ ...businessWorkspace, role: 'owner' }];
let mockReactions = [{ ...campaignReaction, actor: { id: 'actor-1', displayName: 'Viewer', avatarUrl: null } }];

beforeEach(() => {
  jest.clearAllMocks();
  mockCampaigns = [businessCampaign];
  mockWorkspaces = [{ ...businessWorkspace, role: 'owner' }];
  mockReactions = [{ ...campaignReaction, actor: { id: 'actor-1', displayName: 'Viewer', avatarUrl: null } }];
  request.mockImplementation(async ({ url }: { url: string }) => {
    if (url === '/businesses/workspaces') return { data: mockWorkspaces };
    if (url.endsWith('/overview')) return { data: { followerCount: 2, campaignCount: 1, publishedCount: 0, activeCampaign: null } };
    if (url.endsWith('/campaigns')) return { data: mockCampaigns };
    if (url.endsWith('/reactions?limit=100&filter=newest')) return { data: mockReactions };
    if (url.endsWith('/selection')) return { data: { selected: true } };
    throw new Error(`Unsupported request: ${url}`);
  });
});

it('loads approved owner workspaces through the current API', async () => {
  await expect(getMyBusinesses()).resolves.toEqual([expect.objectContaining({ id: businessWorkspace.id, isActive: true })]);
  expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: '/businesses/workspaces' }));
});

it('joins the original overview contract without changing campaign data', async () => {
  const overview = await getStudioOverview('workspace-1');
  expect(overview.workspace.id).toBe('workspace-1');
  expect(overview.latestCampaign?.mediaUrl).toBe(businessCampaign.mediaUrl);
  expect(overview.latestCampaign?.isReplayable).toBe(businessCampaign.replayable);
  expect(overview.deliveryCounts).toEqual(businessCampaign.counts);
});

it('does not construct a workspace grant from the account type', async () => {
  mockWorkspaces = [];
  await expect(getStudioOverview('workspace-1')).rejects.toThrow('not available');
});

it('builds aggregate metrics from authoritative campaign counts and rates', async () => {
  mockCampaigns = [
    { ...businessCampaign, counts: { ...businessCampaign.counts, delivered: 4, opened: 2, viewed: 1 }, metrics: { ...businessCampaign.metrics, viewRate: 25, deliveryRate: 80 } },
    { ...businessCampaign, id: 'campaign-2', counts: { ...businessCampaign.counts, delivered: 1, opened: 1, viewed: 1 }, metrics: { ...businessCampaign.metrics, viewRate: 100, deliveryRate: 100 } },
  ];
  const metrics = await getMetrics('workspace-1');
  expect(metrics).toMatchObject({ totalCampaigns: 2, totalDelivered: 5, totalOpened: 3, totalViewed: 2, avgEngagementRate: 40 });
  expect(metrics.campaigns[0]).toMatchObject({ campaignId: 'campaign-1', engagementRate: 25, deliveryRate: 80 });
});

it('never includes a non-consenting reaction in featured content', async () => {
  mockReactions = [
    { ...mockReactions[0], id: 'private', isPinned: true, consentToFeature: false },
    { ...mockReactions[0], id: 'featured', isPinned: true, consentToFeature: true },
  ];
  const result = await getPinnedReactions('workspace-1');
  expect(result.pinned.map((row) => row.id)).toEqual(['featured']);
});

it('resolves the campaign before using the server-enforced selection endpoint', async () => {
  await pinReaction('workspace-1', 'reaction-1');
  expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ url: '/businesses/workspace-1/campaigns/campaign-1/reactions/reaction-1/selection', method: 'put' }));
});

it('refuses to feature a reaction outside the returned owner gallery', async () => {
  await expect(pinReaction('workspace-1', 'foreign-reaction')).rejects.toThrow('not available');
  expect(request.mock.calls.some(([config]) => config.url.endsWith('/selection'))).toBe(false);
});
