import { fireEvent, render } from '@testing-library/react-native';
import * as mockReactNative from 'react-native';
import BusinessProfileTab from '@/app/(tabs)/business';
import type { User } from '@/services/api/schemas/user.schema';
import type { BusinessOwner, BusinessWorkspace } from '@/services/api/schemas/business.schema';
import { businessWorkspace } from '@/test-utils/businessFixtures';

const mockOpenStudio = jest.fn();
const mockPush = jest.fn();
const mockUseWorkspaces = jest.fn();
const mockRefetch = jest.fn();
let mockUser: User | null;
let mockRows: BusinessOwner[] = [];
let mockQueryError = false;

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('lucide-react-native', () => ({ ChevronLeft: () => null, RefreshCcw: () => null, AlertTriangle: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  Redirect: ({ href }: { href: string }) => <mockReactNative.Text>{`redirect:${href}`}</mockReactNative.Text>,
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: mockUser }),
}));
jest.mock('@/hooks/queries/useBusiness', () => ({
  useBusinessWorkspaces: () => mockUseWorkspaces(),
}));
jest.mock('@/services/navigation', () => ({ openBusinessStudio: (...args: unknown[]) => mockOpenStudio(...args) }));
jest.mock('../BusinessProfileContent', () => ({
  BusinessProfileContent: ({ workspace }: { workspace: BusinessWorkspace }) => <mockReactNative.Text>{`business:${workspace.handle}`}</mockReactNative.Text>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'business-owner', displayName: 'My company', username: 'my-company', avatarUrl: null, createdAt: '2026-10-21', accountType: 'business' };
  mockRows = [];
  mockQueryError = false;
  mockUseWorkspaces.mockImplementation(() => ({ data: mockRows, isLoading: false, isRefetching: false, isError: mockQueryError, refetch: mockRefetch }));
});

describe('Business profile tab access and content', () => {
  it.each(['personal', undefined, null] as const)('blocks direct access for %s accounts before any business query', (accountType) => {
    if (accountType === null) mockUser = null;
    else mockUser = { ...mockUser!, accountType };
    const screen = render(<BusinessProfileTab />);
    expect(screen.getByText('redirect:/(tabs)/profile')).toBeTruthy();
    expect(mockUseWorkspaces).not.toHaveBeenCalled();
  });

  it('shows a business account without a linked workspace and offers profile editing', () => {
    const screen = render(<BusinessProfileTab />);
    expect(screen.getByText('business.profile')).toBeTruthy();
    expect(screen.getByText('My company')).toBeTruthy();
    expect(screen.getByText('business.noLinkedBusiness')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'business.studio' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'settings.account.editProfile' }));
    expect(mockPush).toHaveBeenCalledWith('/(modals)/edit-profile');
  });

  it('opens the signed-in owner workspace and switches between their companies', () => {
    mockRows = [
      { ...businessWorkspace, role: 'owner' },
      { ...businessWorkspace, id: 'second-company', handle: 'second-company', displayName: 'Second company', role: 'owner' },
    ];
    const screen = render(<BusinessProfileTab />);
    expect(screen.getByText('business:test-business')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Second company' }));
    expect(screen.getByText('business:second-company')).toBeTruthy();
    expect(screen.queryByText('business:test-business')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'business.studio' }));
    expect(mockOpenStudio).toHaveBeenCalledTimes(1);
  });

  it('removes the business screen immediately when the account becomes personal', () => {
    const screen = render(<BusinessProfileTab />);
    mockUser = { ...mockUser!, accountType: 'personal' };
    screen.rerender(<BusinessProfileTab />);
    expect(screen.getByText('redirect:/(tabs)/profile')).toBeTruthy();
    expect(screen.queryByText('business.profile')).toBeNull();
    expect(mockUseWorkspaces).toHaveBeenCalledTimes(1);
  });

  it('hides stale company content on error and allows retry', () => {
    mockRows = [{ ...businessWorkspace, role: 'owner' }];
    mockQueryError = true;
    const screen = render(<BusinessProfileTab />);
    expect(screen.queryByText('business:test-business')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'common.tryAgain' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
