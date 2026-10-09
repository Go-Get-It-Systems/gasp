import { api } from '@/services/api';
import * as business from '../business';
import { businessCampaign, campaignReaction } from '@/test-utils/businessFixtures';

jest.mock('@/services/api', () => ({ api: { request: jest.fn() } }));
const request = api.request as jest.Mock;
describe('Business adapters', () => {
  beforeEach(() => request.mockReset());
  it('sends false consent explicitly', async () => {
    request.mockResolvedValue({ data: campaignReaction });
    await business.submitCampaignReaction('w', 'c', { videoUrl: campaignReaction.videoUrl, consentToFeature: false });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: '/businesses/w/campaigns/c/reactions', method: 'post', data: { videoUrl: campaignReaction.videoUrl, consentToFeature: false } }));
  });
  it('rejects missing consent before the request', async () => {
    expect(() => business.submitCampaignReaction('w', 'c', { videoUrl: campaignReaction.videoUrl } as never)).toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it('fails closed on malformed server data', async () => {
    request.mockResolvedValue({ data: { ...businessCampaign, counts: {} } });
    await expect(business.getBusinessCampaign('w', 'c')).rejects.toThrow();
  });
  it('uses a bounded owner gallery with supported query parameters only', async () => {
    request.mockResolvedValue({ data: [] });
    await business.getOwnerReactions('w', 'c', true);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: '/businesses/w/campaigns/c/reactions?limit=100&filter=selected' }));
  });
  it('withdraws independently of directory/workspace queries', async () => {
    request.mockResolvedValue({ data: campaignReaction });
    await business.setCampaignReactionConsent('w', 'c', false);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: 'patch', data: { consentToFeature: false } }));
  });
  it('escapes identifiers instead of injecting extra route segments', async () => {
    request.mockResolvedValue({ data: businessCampaign });
    await business.getBusinessCampaign('w/path', 'c?x=1');
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: '/businesses/w%2Fpath/campaigns/c%3Fx%3D1' }));
  });
});
