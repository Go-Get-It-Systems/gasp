import { resolveBusinessNotificationRoute, resolveNotificationRoute } from '../notificationRouting';

describe('Business notification routing', () => {
  const route = '/(modals)/business-profile?handle=pilot&campaignId=campaign-1';
  it('opens the consumer business profile, never a personal viewer or owner Studio', () => {
    expect(resolveNotificationRoute({ kind: 'gasp.received', gaspId: 'gasp-1', route })).toBe(route);
  });
  it.each([
    'https://example.com/(modals)/business-profile?handle=pilot&campaignId=c',
    '/(modals)/business-studio?handle=pilot&campaignId=c',
    '/(modals)/business-profile?handle=pilot',
    '/(modals)/business-profile?handle=pilot&campaignId=c&campaignId=d',
    '/(modals)/business-profile?handle=pilot&campaignId=c&redirect=https://example.com',
    '/(modals)/business-profile?handle=..%2Fsecret&campaignId=c',
  ])('does not trust a foreign or malformed route: %s', (invalid) => {
    expect(resolveBusinessNotificationRoute(invalid)).toBeNull();
  });
  it('sends malformed business notifications to the inbox safely', () => {
    expect(resolveNotificationRoute({ kind: 'gasp.received', gaspId: 'g', route: '/(modals)/business-profile?handle=pilot' })).toBe('/(tabs)/inbox');
  });
  it('preserves personal notification routing', () => {
    expect(resolveNotificationRoute({ kind: 'gasp.received', gaspId: 'g' })).toBe('/(modals)/view-gasp?gaspId=g');
  });
});
