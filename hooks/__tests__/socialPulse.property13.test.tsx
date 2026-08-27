import * as fc from 'fast-check';
import { render } from '@testing-library/react-native';
import InboxScreen from '@/app/(tabs)/inbox';

const mockReactionListener = jest.fn(() => jest.fn());

jest.mock('@/services/socket', () => ({
  getSocket: jest.fn(() => ({ connected: true })),
  onGaspReactionReceived: mockReactionListener,
  onGaspReceived: jest.fn(() => jest.fn()),
  onGaspViewed: jest.fn(() => jest.fn()),
  onGaspExpired: jest.fn(() => jest.fn()),
  onGaspStatusUpdated: jest.fn(() => jest.fn()),
  onNotificationEvent: jest.fn(() => jest.fn()),
  onPresenceBulkStatus: jest.fn(() => jest.fn()),
  onPresenceUserOnline: jest.fn(() => jest.fn()),
  onPresenceUserOffline: jest.fn(() => jest.fn()),
  onChatNewMessage: jest.fn(() => jest.fn()),
  onChatTyping: jest.fn(() => jest.fn()),
  onChatMessageRead: jest.fn(() => jest.fn()),
  onChatConversationUpdated: jest.fn(() => jest.fn()),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (state: { isAuthenticated: boolean }) => unknown) => selector({ isAuthenticated: true }),
    { getState: () => ({ user: { id: 'user-1' } }) },
  ),
}));
jest.mock('@/stores/chatStore', () => ({ useChatStore: { getState: () => ({ activeConversationId: null, setTypingUser: jest.fn() }) } }));
jest.mock('@/stores/gaspStore', () => ({ useGaspStore: { getState: () => ({ markGaspViewed: jest.fn(), addReaction: jest.fn() }) } }));
jest.mock('@/stores/inboxStore', () => ({ useInboxStore: { getState: () => ({ setBulkOnlineStatus: jest.fn(), setFriendOnlineStatus: jest.fn() }) } }));
jest.mock('@/stores/notificationStore', () => ({ useNotificationStore: { getState: () => ({ enqueueToast: jest.fn(), setInboxUnreadType: jest.fn(), triggerTabPulse: jest.fn(), setChatHasUnread: jest.fn() }) } }));
jest.mock('@/hooks/queries/useChat', () => ({ addMessageToCache: jest.fn() }));

const mockEmptyQuery = {
  data: [], isLoading: false, isError: false, isRefetching: false,
  refetch: jest.fn(), hasNextPage: false, isFetchingNextPage: false, fetchNextPage: jest.fn(),
};
jest.mock('@/hooks/queries/useFriends', () => ({
  usePendingFriendRequests: () => mockEmptyQuery,
  useAcceptFriendRequest: () => ({ mutate: jest.fn() }),
  useRejectFriendRequest: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/queries/useGasps', () => ({
  usePendingGasps: () => mockEmptyQuery,
  useSentGasps: () => mockEmptyQuery,
  useLatestMoment: () => ({ ...mockEmptyQuery, data: null }),
}));
jest.mock('@/hooks/queries/useReactions', () => ({ useReceivedReactions: () => mockEmptyQuery }));
jest.mock('@/services/navigation', () => ({ openGaspViewer: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

jest.mock('@/components/inbox/GaspsPulseHeader', () => ({ GaspsPulseHeader: () => null }));
jest.mock('@/components/inbox/OpenNowRail', () => ({ OpenNowRail: () => null }));
jest.mock('@/components/inbox/LatestMomentCard', () => ({ LatestMomentCard: () => null }));
jest.mock('@/components/inbox/ReactionReturnSection', () => ({ ReactionReturnSection: () => null }));
jest.mock('@/components/inbox/FriendRequestSection', () => ({ FriendRequestSection: () => null }));
jest.mock('@/components/inbox/SectionHeader', () => ({ SectionHeader: () => null }));
jest.mock('@/components/inbox/SentGaspItem', () => ({ SentGaspItem: () => null }));

describe('Feature: gasps-social-pulse, Property 13: socket listener cleanup', () => {
  it('never registers a screen-owned reaction listener across repeated mounts', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 12 }), (mountCount) => {
      for (let index = 0; index < mountCount; index += 1) {
        const screen = render(<InboxScreen />);
        screen.unmount();
      }
      expect(mockReactionListener).not.toHaveBeenCalled();
    }), { numRuns: 100 });
  });
});
