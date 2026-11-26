import { render, within } from '@testing-library/react-native';
import * as mockNative from 'react-native';
import StudioScreen from '../StudioScreen';

let mockCounts: { delivered: number; opened: number; viewed: number; reacted: number } | null;
const mockWorkspace = { id: 'workspace-1', displayName: 'Demo', handle: 'demo', isActive: true };
jest.mock('@/stores/authStore', () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ user: { id: 'owner' } }) }));
jest.mock('@/stores/businessStore', () => ({
  useBusinessStore: () => ({ activeWorkspace: mockWorkspace, setActiveWorkspace: jest.fn() }),
  businessQueryKeys: { mine: () => ['workspaces'], overview: () => ['overview'], reactions: () => ['reactions'], metrics: () => ['metrics'] },
}));
jest.mock('@/services/api/business', () => ({}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'workspaces' ? [mockWorkspace] : queryKey[0] === 'overview' ? {
      workspace: mockWorkspace, deliveryCounts: mockCounts,
      latestCampaign: { id: 'campaign-1', title: 'Demo campaign', state: 'live', publishedAt: null },
    } : undefined,
    isLoading: false, isFetching: false, refetch: jest.fn(),
  }),
  useMutation: () => ({ mutate: jest.fn() }),
  useQueryClient: () => ({ removeQueries: jest.fn() }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../BusinessStudioHeader', () => ({ BusinessStudioHeader: () => null }));
jest.mock('../BusinessStudioProfile', () => ({ BusinessStudioProfile: () => null }));
jest.mock('../FeaturedReactionsGrid', () => ({ FeaturedReactionsGrid: () => null }));
jest.mock('../ActiveCampaignCard', () => ({ ActiveCampaignCard: ({ subtitle }: { subtitle: string }) => <mockNative.Text>{subtitle}</mockNative.Text> }));

function statColumn(screen: ReturnType<typeof render>, label: string) {
  let node = screen.getByText(label).parent;
  while (node && node.type !== 'View') node = node.parent;
  if (!node) throw new Error('Missing stat column');
  return within(node);
}

beforeEach(() => { mockCounts = { delivered: 20, opened: 12, viewed: 8, reacted: 3 }; });

it('labels actual reactions and opens separately from deliveries, including the campaign subtitle', () => {
  const screen = render(<StudioScreen />);
  expect(statColumn(screen, 'REACTIONS').getByText('3')).toBeTruthy();
  expect(statColumn(screen, 'OPENS').getByText('12')).toBeTruthy();
  expect(screen.getByText('3 reactions')).toBeTruthy();
  expect(screen.getByText('40%')).toBeTruthy();
});

it('shows zero counts when no campaign counts are available', () => {
  mockCounts = null;
  const screen = render(<StudioScreen />);
  expect(statColumn(screen, 'REACTIONS').getByText('0')).toBeTruthy();
  expect(statColumn(screen, 'OPENS').getByText('0')).toBeTruthy();
  expect(screen.getByText('0 reactions')).toBeTruthy();
});
