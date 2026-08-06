import ChatScreen from '../chat';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as mockReactNative from 'react-native';

const mockOpenChat = jest.fn();
const mockGetOrCreateConversation = jest.fn();

jest.mock('@legendapp/list', () => ({
  LegendList: ({ data, renderItem }: { data: unknown[]; renderItem: (item: { item: unknown }) => ReactNode }) => {
    return <mockReactNative.View>{data.map((item, index) => <mockReactNative.View key={index}>{renderItem({ item })}</mockReactNative.View>)}</mockReactNative.View>;
  },
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/services/navigation', () => ({ openChat: mockOpenChat }));

jest.mock('@/components/inbox/InboxHeader', () => ({
  InboxHeader: ({ title }: { title: string }) => {
    return <mockReactNative.Text>{title}</mockReactNative.Text>;
  },
}));
jest.mock('@/components/inbox/SendGaspToAllButton', () => ({
  SendGaspToAllButton: ({ onPress }: { onPress: () => void }) => {
    return <mockReactNative.Pressable accessibilityRole="button" accessibilityLabel="Send Gasp to All" onPress={onPress}><mockReactNative.Text>Send Gasp to All</mockReactNative.Text></mockReactNative.Pressable>;
  },
}));
jest.mock('@/components/inbox/FriendListItem', () => ({
  FriendListItem: ({ name, onPress }: { name: string; onPress: () => void }) => {
    return <mockReactNative.Pressable accessibilityRole="button" accessibilityLabel={`Friend ${name}`} onPress={onPress}><mockReactNative.Text>{`friend:${name}`}</mockReactNative.Text></mockReactNative.Pressable>;
  },
}));
jest.mock('@/components/chat/ConversationListItem', () => ({
  ConversationListItem: ({ participant, onPress }: { participant: { name: string }; onPress: () => void }) => {
    return <mockReactNative.Pressable accessibilityRole="button" accessibilityLabel={`Chat ${participant.name}`} onPress={onPress}><mockReactNative.Text>{`chat:${participant.name}`}</mockReactNative.Text></mockReactNative.Pressable>;
  },
}));
jest.mock('@/components/ui/SearchBar', () => ({
  SearchBar: ({ value, onChangeText, placeholder }: { value: string; onChangeText: (text: string) => void; placeholder: string }) => {
    return <mockReactNative.TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} accessibilityLabel="Search" />;
  },
}));
jest.mock('@/components/ui/QueryState', () => ({
  QueryState: ({ data, children }: { data: unknown[]; children: (items: unknown[]) => ReactNode }) => children(data),
}));

jest.mock('@/hooks/queries/useChat', () => ({
  useConversations: () => ({
    data: [{
      id: 'conversation-1',
      participantIds: ['current-user', 'marina'],
      participantNames: ['Current User', 'Marina'],
      participantAvatars: [null, null],
      unreadCount: 1,
      updatedAt: '2026-08-01T12:00:00.000Z',
      lastMessageAt: '2026-08-01T12:00:00.000Z',
      lastMessage: {
        id: 'message-1', conversationId: 'conversation-1', senderId: 'marina', content: 'Hi', type: 'text', createdAt: '2026-08-01T12:00:00.000Z',
      },
    }],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useGetOrCreateConversation: () => ({ mutateAsync: mockGetOrCreateConversation }),
}));
jest.mock('@/hooks/queries/useFriends', () => ({
  useFriends: () => ({
    data: [{
      id: 'lucas', displayName: 'Lucas', username: 'lucas', avatarUrl: null,
      onlineStatus: 'online', lastSeenAt: '2026-08-01T12:00:00.000Z', friendshipId: 'friendship-1',
    }],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/stores/authStore', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: { id: 'current-user' } }) }));
jest.mock('@/stores/inboxStore', () => ({
  useInboxStore: (selector: (state: unknown) => unknown) => selector({ friends: [] }),
  mapFriendToInbox: (friend: { id: string; displayName: string; username: string; avatarUrl: string | null; onlineStatus: string; friendshipId: string }) => ({
    id: friend.id, name: friend.displayName, username: friend.username, avatarUrl: friend.avatarUrl,
    onlineStatus: friend.onlineStatus, statusText: '', statusEmoji: '', timestamp: '', actionType: 'none', badgeCount: 0, thumbnailUrl: null, friendshipId: friend.friendshipId,
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'chat.inbox.title': 'CHAT', 'chat.inbox.chats': 'Chats', 'chat.inbox.friends': 'Friends',
      'chat.inbox.searchChats': 'Search chats...', 'chat.inbox.searchFriends': 'Search friends...',
      'chat.inbox.noChats': 'No chats yet', 'chat.inbox.noChatsSubtitle': 'Start a conversation with a friend.',
      'chat.inbox.noChatsFound': 'No chats found', 'chat.inbox.noFriends': 'No friends yet',
      'chat.inbox.noFriendsSubtitle': 'Add friends to start chatting.', 'chat.inbox.noFriendsFound': 'No friends found',
      'chat.inbox.tryAnotherSearch': 'Try a different search.', 'chat.inbox.findFriends': 'Find friends',
    })[key] ?? key,
  }),
}));

describe('ChatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrCreateConversation.mockResolvedValue({ id: 'conversation-lucas' });
  });

  it('shows Chats by default, switches to Friends, and retains the camera CTA', async () => {
    const { getByText, getByRole, getByPlaceholderText, queryByText } = render(<ChatScreen />);

    expect(getByText('chat:Marina')).toBeTruthy();
    expect(queryByText('friend:Lucas')).toBeNull();
    expect(getByPlaceholderText('Search chats...')).toBeTruthy();

    fireEvent.press(getByRole('tab', { name: 'Friends' }));
    expect(getByText('friend:Lucas')).toBeTruthy();
    expect(getByPlaceholderText('Search friends...')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Send Gasp to All' }));
    const { router } = jest.requireMock('expo-router');
    expect(router.push).toHaveBeenCalledWith('/(tabs)/camera');
  });
});
