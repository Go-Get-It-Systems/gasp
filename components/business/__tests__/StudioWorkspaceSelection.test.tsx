import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as mockNative from 'react-native';
import { router } from 'expo-router';
import * as api from '@/services/api/business';
import { businessQueryKeys, useBusinessStore } from '@/stores/businessStore';
import type { StudioWorkspace } from '@/services/api/schemas/studio.schema';
import StudioScreen from '../StudioScreen';

jest.unmock('@tanstack/react-query');
jest.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign(
  (select: (s: unknown) => unknown) => select({ user: { id: 'owner' } }),
  { getState: () => ({ user: { id: 'owner' } }), subscribe: jest.fn() },
) }));
jest.mock('@/services/api/business', () => ({
  getMyBusinesses: jest.fn(), getStudioOverview: jest.fn(), getCampaignReactions: jest.fn(),
  getPinnedReactions: jest.fn(), getMetrics: jest.fn(), pinReaction: jest.fn(), unpinReaction: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../BusinessStudioHeader', () => ({ BusinessStudioHeader: ({ title }: { title: string }) => <mockNative.Text>{title}</mockNative.Text> }));
jest.mock('../BusinessStudioProfile', () => ({ BusinessStudioProfile: ({ handle, onCreateGasp }: { handle: string; onCreateGasp: () => void }) =>
  <mockNative.Pressable accessibilityRole="button" accessibilityLabel="New Campaign" onPress={onCreateGasp}><mockNative.Text>{`profile:${handle}`}</mockNative.Text></mockNative.Pressable> }));
jest.mock('../FeaturedReactionsGrid', () => ({ FeaturedReactionsGrid: () => null }));
jest.mock('../ActiveCampaignCard', () => ({ ActiveCampaignCard: () => null }));

const companies: StudioWorkspace[] = ['Nike', 'Adidas'].map((name, index) => ({
  id: name.toLowerCase(), displayName: name, handle: name.toLowerCase(),
  avatarUrl: null, bio: null, verificationStatus: 'verified', isVerified: true,
  followerCount: 1, isFollowing: false, isActive: index === 0,
}));
const overview = (id: string) => ({ workspace: companies.find((w) => w.id === id)!, latestCampaign: null, deliveryCounts: null });
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  useBusinessStore.getState().exitStudio();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  jest.mocked(api.getMyBusinesses).mockResolvedValue(companies);
  jest.mocked(api.getStudioOverview).mockImplementation(async (id) => overview(id));
  jest.mocked(api.getCampaignReactions).mockImplementation(async (id) => ({ workspaceId: id, total: 0, reactions: [] }));
  jest.mocked(api.getPinnedReactions).mockImplementation(async (id) => ({ workspaceId: id, pinned: [] }));
  jest.mocked(api.getMetrics).mockImplementation(async (id) => ({
    workspaceId: id, totalCampaigns: 0, totalDelivered: 0, totalOpened: 0,
    totalViewed: 0, avgEngagementRate: 0, campaigns: [],
  }));
});
afterEach(() => client.clear());
const mount = () => render(<QueryClientProvider client={client}><StudioScreen /></QueryClientProvider>);

it('switches all reads and campaign creation to the selected business without old placeholders', async () => {
  const screen = mount();
  await screen.findByText('profile:nike');
  let completeAdidas!: (value: ReturnType<typeof overview>) => void;
  jest.mocked(api.getStudioOverview).mockImplementation((id) => id === 'adidas'
    ? new Promise((resolve) => { completeAdidas = resolve; }) : Promise.resolve(overview(id)));
  fireEvent.press(screen.getByRole('button', { name: 'Adidas' }));
  expect(screen.queryByText('profile:nike')).toBeNull();
  await waitFor(() => expect(api.getStudioOverview).toHaveBeenCalledWith('adidas'));
  await act(async () => completeAdidas(overview('adidas')));
  await screen.findByText('profile:adidas');
  expect(api.getCampaignReactions).toHaveBeenCalledWith('adidas');
  expect(api.getPinnedReactions).toHaveBeenCalledWith('adidas');
  fireEvent.press(screen.getByRole('button', { name: 'New Campaign' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/(modals)/campaign-composer', params: { workspaceId: 'adidas' } });
  fireEvent.press(screen.getByText('Metrics'));
  await waitFor(() => expect(api.getMetrics).toHaveBeenCalledWith('adidas'));
  await act(async () => { await client.invalidateQueries({ queryKey: businessQueryKeys.mine() }); });
  expect(useBusinessStore.getState().activeWorkspace?.id).toBe('adidas');
  fireEvent.press(screen.getByRole('button', { name: 'Nike' }));
  await waitFor(() => expect(api.getMetrics).toHaveBeenCalledWith('nike'));
});

it('discards a cached selection when ownership is removed', async () => {
  useBusinessStore.getState().setActiveWorkspace(companies[1]);
  const screen = mount();
  await screen.findByText('profile:adidas');
  jest.mocked(api.getMyBusinesses).mockResolvedValue([companies[0]]);
  await act(async () => { await client.invalidateQueries({ queryKey: businessQueryKeys.mine() }); });
  await screen.findByText('profile:nike');
  expect(screen.queryByRole('button', { name: 'Adidas' })).toBeNull();
  expect(useBusinessStore.getState().activeWorkspace?.id).toBe('nike');
});
