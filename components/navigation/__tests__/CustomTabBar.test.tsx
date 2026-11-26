import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent, render } from '@testing-library/react-native';
import * as mockReactNative from 'react-native';
import { CustomTabBar } from '../CustomTabBar';

let mockAccountType: 'personal' | 'business' | undefined = 'personal';
const mockNavigate = jest.fn();
const mockEmit = jest.fn(() => ({ defaultPrevented: false }));
const mockSetUnread = jest.fn();
const mockResetPulse = jest.fn();

jest.mock('expo-blur', () => ({ BlurView: () => null }));
jest.mock('lucide-react-native', () => ({
  Camera: () => null, Sparkles: () => null, Compass: () => null,
  Inbox: () => null, MessageCircle: () => null, User: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key === 'business.studio' ? 'Business Studio' : key }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: { accountType: mockAccountType } }),
}));
jest.mock('@/hooks/queries/useChat', () => ({ useConversations: () => ({ data: [{ unreadCount: 1 }], dataUpdatedAt: 1 }) }));
jest.mock('@/hooks/queries/useGasps', () => ({ usePendingGasps: () => ({ data: [] }) }));
jest.mock('@/stores/gaspStore', () => ({
  useGaspStore: (selector: (state: unknown) => unknown) => selector({ viewedGaspUrls: {} }),
}));
jest.mock('@/stores/notificationStore', () => ({
  useNotificationStore: (selector: (state: unknown) => unknown) => selector({
    inboxUnreadType: null, chatHasUnread: true, chatUnreadHintAt: 1,
    setChatHasUnread: mockSetUnread, tabPulseTrigger: 0, resetTabPulse: mockResetPulse,
  }),
}));
jest.mock('@/components/ui/ContentTypeIndicator', () => ({
  ContentTypeIndicator: ({ type }: { type: string }) => <mockReactNative.Text>{`unread:${type}`}</mockReactNative.Text>,
}));

function tabProps(focused = 'camera'): BottomTabBarProps {
  const names = ['discover', 'camera', 'inbox', 'chat', 'business', 'studio', 'profile'];
  const routes = names.map((name) => ({ key: `tab-${name}`, name }));
  return {
    state: { key: 'tabs', type: 'tab', stale: false, index: names.indexOf(focused), routes, routeNames: names, history: [] },
    descriptors: Object.fromEntries(routes.map((route) => [route.key, { options: {} }])),
    navigation: { emit: mockEmit, navigate: mockNavigate },
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
}

beforeEach(() => { jest.clearAllMocks(); mockAccountType = 'personal'; });

describe('account-specific bottom navigation', () => {
  it.each(['personal', undefined] as const)('keeps Chat and hides Studio for %s accounts', (accountType) => {
    mockAccountType = accountType;
    const screen = render(<CustomTabBar {...tabProps()} />);
    expect(screen.getByRole('tab', { name: 'Chat tab' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Perfil empresarial' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Business Studio' })).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByText('unread:chat')).toBeTruthy();
  });

  it('puts Studio in the former Empresa slot for a business account', () => {
    mockAccountType = 'business';
    const screen = render(<CustomTabBar {...tabProps()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs[3].props.accessibilityLabel).toBe('Business Studio');
    expect(screen.queryByText('Empresa')).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Chat tab' })).toBeNull();
    expect(screen.queryByText('unread:chat')).toBeNull();

    fireEvent.press(screen.getByRole('tab', { name: 'Business Studio' }));
    expect(mockEmit).toHaveBeenCalledWith({ type: 'tabPress', target: 'tab-studio', canPreventDefault: true });
    expect(mockNavigate).toHaveBeenCalledWith('studio', undefined);
  });

  it('keeps the correct active tab when the hidden Chat route precedes it', () => {
    mockAccountType = 'business';
    const screen = render(<CustomTabBar {...tabProps('studio')} />);
    expect(screen.getByRole('tab', { name: 'Business Studio' }).props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByRole('tab', { name: 'Business Studio' }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('updates visibility when the signed-in account type changes', () => {
    mockAccountType = 'business';
    const props = tabProps();
    const screen = render(<CustomTabBar {...props} />);
    mockAccountType = 'personal';
    screen.rerender(<CustomTabBar {...props} />);
    expect(screen.queryByRole('tab', { name: 'Business Studio' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Chat tab' })).toBeTruthy();
  });
});
