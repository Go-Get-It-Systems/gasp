import { act, fireEvent, render } from '@testing-library/react-native';
import { BusinessFollowButton } from '../BusinessFollowButton';
import { CampaignInboxSection } from '../BusinessEntries';
import { businessWorkspace } from '@/test-utils/businessFixtures';
import { advanceSession } from '@/services/session';

const mockMutate = jest.fn();
const mockGasps = jest.fn();
const mockExplore = jest.fn();
const mockViewer = jest.fn();
let mockActor = 'bi';
let mockSegments = ['(tabs)', 'discover'];
type QueryResult<T> = { data: T[] | undefined; isLoading: boolean; isError: boolean; refetch: jest.Mock };
let mockDirectory: QueryResult<typeof businessWorkspace>;
let mockInbox: QueryResult<{ id: string; senderName: string; handle: string; workspaceId: string; campaignId: string }>;
let mockMutationError = false;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, vars?: { name?: string }) => vars?.name ? `${key}: ${vars.name}` : key }) }));
jest.mock('@/hooks/queries/useBusiness', () => ({
  useBusinessActor: () => mockActor,
  useBusinessProfile: () => ({ isLoading: false, isError: false }),
  useBusinessWorkspaces: () => ({ data: [], isLoading: false, isError: false }),
  useBusinessDirectory: () => mockDirectory,
  useCampaignInbox: () => mockInbox,
}));
jest.mock('@/hooks/queries/useBusinessMutations', () => ({ useBusinessFollow: () => ({ mutate: mockMutate, isPending: false, isError: mockMutationError }) }));
jest.mock('@/services/navigation', () => ({ openBusinessGasps: (...args: unknown[]) => mockGasps(...args), openBusinessDiscovery: () => mockExplore(), openCampaignViewer: (...args: unknown[]) => mockViewer(...args) }));
jest.mock('@/components/discover/BusinessDiscoverCard', () => ({ BusinessDiscoverCard: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useSegments: () => mockSegments }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

beforeEach(() => {
  jest.clearAllMocks(); mockSegments = ['(tabs)', 'discover']; mockActor = 'bi'; mockMutationError = false;
  mockDirectory = { data: [businessWorkspace], isLoading: false, isError: false, refetch: jest.fn() };
  mockInbox = { data: [], isLoading: false, isError: false, refetch: jest.fn() };
});

it('explains the next delivery only after follow succeeds and links to Gasps', () => {
  const screen = render(<BusinessFollowButton handle={businessWorkspace.handle} workspace={businessWorkspace} />);
  fireEvent.press(screen.getByRole('button', { name: `business.follow @${businessWorkspace.handle}` }), { stopPropagation: jest.fn() });
  expect(screen.queryByText('business.followNextGasps')).toBeNull();
  expect(mockMutate.mock.calls[0][0]).toBe(true);
  act(() => mockMutate.mock.calls[0][1].onSuccess());
  expect(screen.getByText(`business.followSuccess: ${businessWorkspace.displayName}`)).toBeTruthy();
  fireEvent.press(screen.getByText('business.goToGasps'), { stopPropagation: jest.fn() });
  expect(mockGasps).toHaveBeenCalledWith(false);
});

it('does not show success on a failed follow or when unfollowing', () => {
  const screen = render(<BusinessFollowButton handle={businessWorkspace.handle} workspace={businessWorkspace} />);
  fireEvent.press(screen.getByRole('button', { name: `business.follow @${businessWorkspace.handle}` }), { stopPropagation: jest.fn() });
  mockMutationError = true;
  screen.rerender(<BusinessFollowButton handle={businessWorkspace.handle} workspace={businessWorkspace} />);
  expect(screen.getByText('business.error')).toBeTruthy();
  expect(screen.queryByText('business.followNextGasps')).toBeNull();
  screen.rerender(<BusinessFollowButton handle={businessWorkspace.handle} workspace={{ ...businessWorkspace, isFollowing: true }} />);
  fireEvent.press(screen.getByRole('button', { name: `business.unfollow @${businessWorkspace.handle}` }), { stopPropagation: jest.fn() });
  expect(mockMutate).toHaveBeenLastCalledWith(false);
  expect(screen.queryByText('business.followNextGasps')).toBeNull();
});

it('ignores a follow completing after a session change', () => {
  const screen = render(<BusinessFollowButton handle={businessWorkspace.handle} workspace={businessWorkspace} />);
  fireEvent.press(screen.getByRole('button', { name: `business.follow @${businessWorkspace.handle}` }), { stopPropagation: jest.fn() });
  advanceSession(); mockActor = 'iaco';
  act(() => mockMutate.mock.calls[0][1].onSuccess());
  screen.rerender(<BusinessFollowButton handle={businessWorkspace.handle} workspace={businessWorkspace} />);
  expect(screen.queryByText('business.followNextGasps')).toBeNull();
});

it('invites a customer who follows no brands to Discover', () => {
  const screen = render(<CampaignInboxSection />);
  expect(screen.getByText('business.emptyInboxFollowBrands')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'business.exploreBrands' }));
  expect(mockExplore).toHaveBeenCalledTimes(1);
});

it('explains future delivery when already following a brand', () => {
  mockDirectory.data = [{ ...businessWorkspace, isFollowing: true }];
  const screen = render(<CampaignInboxSection />);
  expect(screen.getByText('business.emptyInboxFollowing')).toBeTruthy();
  expect(screen.queryByText('business.exploreBrands')).toBeNull();
});

it.each(['loading', 'error', 'disabled'])('does not mislabel unavailable directory data as following no brands: %s', (state) => {
  mockDirectory = { ...mockDirectory, isLoading: state === 'loading', isError: state === 'error', data: state === 'disabled' ? [] : undefined };
  const screen = render(<CampaignInboxSection />);
  expect(screen.queryByText('business.emptyInboxFollowBrands')).toBeNull();
});

it('does not present inbox failures as an empty inbox', () => {
  mockInbox.isError = true;
  const screen = render(<CampaignInboxSection />);
  expect(screen.queryByText('business.emptyInboxFollowBrands')).toBeNull();
  expect(screen.queryByText('business.emptyInboxFollowing')).toBeNull();
});

it('continues opening received campaigns normally', () => {
  mockInbox.data = [{ id: 'delivery', senderName: 'Nike', handle: 'nike', workspaceId: 'nike-id', campaignId: 'campaign' }];
  const screen = render(<CampaignInboxSection />);
  fireEvent.press(screen.getByRole('button', { name: 'Nike · @nike' }));
  expect(mockViewer).toHaveBeenCalledWith({ workspaceId: 'nike-id', campaignId: 'campaign', handle: 'nike' });
  expect(screen.queryByText('business.emptyInbox')).toBeNull();
});

it('dismisses the brand profile before opening Gasps', () => {
  mockSegments = ['(modals)', 'business-profile'];
  const screen = render(<BusinessFollowButton handle={businessWorkspace.handle} workspace={businessWorkspace} variant="profile" />);
  fireEvent.press(screen.getByRole('button', { name: `business.follow @${businessWorkspace.handle}` }), { stopPropagation: jest.fn() });
  act(() => mockMutate.mock.calls[0][1].onSuccess());
  fireEvent.press(screen.getByText('business.goToGasps'), { stopPropagation: jest.fn() });
  expect(mockGasps).toHaveBeenCalledWith(true);
});
