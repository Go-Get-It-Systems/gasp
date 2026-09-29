import { ConversationListItem } from '@/components/chat/ConversationListItem';
import type { Conversation } from '@/services/api/schemas/chat.schema';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      const copy: Record<string, string> = {
        'chat.inbox.sentGasp': 'Sent you a Gasp',
        'chat.inbox.reactedToGasp': 'Reacted to your Gasp',
        'chat.inbox.sentPhoto': 'Sent a photo',
        'chat.inbox.startConversation': 'Start the conversation',
        'chat.inbox.now': 'now',
      };
      if (key === 'chat.inbox.conversationAccessibility') return `${values?.name}, ${values?.preview}`;
      if (key === 'chat.inbox.conversationUnreadAccessibility') return `${values?.name}, ${values?.preview}, ${values?.count} unread messages`;
      return copy[key] ?? key;
    },
  }),
}));

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conversation-1',
    participantIds: ['current-user', 'friend-1'],
    participantNames: ['Current User', 'Marina'],
    participantAvatars: [null, null],
    unreadCount: 2,
    updatedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    lastMessage: {
      id: 'message-1',
      conversationId: 'conversation-1',
      senderId: 'friend-1',
      content: 'hello there',
      type: 'text',
      createdAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe('ConversationListItem', () => {
  it('renders identity, preview, unread state, and an accessible press target', () => {
    const onPress = jest.fn();
    const { getByRole, getByText } = render(
      <ConversationListItem
        conversation={makeConversation()}
        participant={{ id: 'friend-1', name: 'Marina', avatarUrl: null }}
        isOnline
        onPress={onPress}
      />,
    );

    expect(getByText('Marina')).toBeTruthy();
    expect(getByText('hello there')).toBeTruthy();
    const row = getByRole('button', { name: 'Marina, hello there, 2 unread messages' });
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses a privacy-safe Gasp preview and omits the unread badge when read', () => {
    const { getByText, queryByLabelText } = render(
      <ConversationListItem
        conversation={makeConversation({
          unreadCount: 0,
          lastMessage: makeConversation().lastMessage ? {
            ...makeConversation().lastMessage!,
            type: 'gasp',
            content: 'private media',
          } : undefined,
        })}
        participant={{ id: 'friend-1', name: 'Marina', avatarUrl: null }}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('Sent you a Gasp')).toBeTruthy();
    expect(queryByLabelText('0 unread')).toBeNull();
  });
});
