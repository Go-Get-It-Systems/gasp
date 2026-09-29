import { resolveChatParticipant } from '@/services/chatParticipant';
import { ConversationResponseSchema } from '@/services/api/schemas/chat.schema';

const cachedConversation = {
  id: 'conv-1',
  participantIds: ['me', 'alex'],
  participantNames: ['Me', 'Alex'],
  participantAvatars: [null, 'https://example.com/alex.jpg'],
  unreadCount: 0,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('resolveChatParticipant', () => {
  it('uses cached conversation identity before notification route metadata', () => {
    expect(resolveChatParticipant({
      conversation: cachedConversation,
      currentUserId: 'me',
      routeName: 'Route Alex',
    })).toEqual({ id: 'alex', name: 'Alex', avatarUrl: 'https://example.com/alex.jpg' });
  });

  it('uses notification route metadata while the conversation cache is cold', () => {
    expect(resolveChatParticipant({
      currentUserId: 'me',
      routeName: 'Alex',
      routeAvatarUrl: 'https://example.com/alex.jpg',
    })).toEqual({ name: 'Alex', avatarUrl: 'https://example.com/alex.jpg' });
  });

  it('uses fetched conversation identity before the final safe fallback', () => {
    expect(resolveChatParticipant({
      currentUserId: 'me',
      fetchedConversation: cachedConversation,
    })).toEqual({ id: 'alex', name: 'Alex', avatarUrl: 'https://example.com/alex.jpg' });
    expect(resolveChatParticipant({ currentUserId: 'me' })).toEqual({ name: 'Chat', avatarUrl: undefined, id: undefined });
  });

  it('normalizes the backend participants transport shape', () => {
    const conversation = ConversationResponseSchema.parse({
      id: 'conv-1',
      participants: [
        { userId: 'me', displayName: 'Me', username: 'me', avatarUrl: null },
        { userId: 'alex', displayName: 'Alex', username: 'alex', avatarUrl: 'https://example.com/alex.jpg' },
      ],
      lastMessage: null,
      unreadCount: 0,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(resolveChatParticipant({ conversation, currentUserId: 'me' })).toEqual({
      id: 'alex',
      name: 'Alex',
      avatarUrl: 'https://example.com/alex.jpg',
    });
  });

  it('falls back to route metadata when cached conversation data is malformed', () => {
    expect(resolveChatParticipant({
      conversation: { id: 'conv-1' } as typeof cachedConversation,
      currentUserId: 'me',
      routeName: 'Alex',
      routeAvatarUrl: 'https://example.com/alex.jpg',
    })).toEqual({ name: 'Alex', avatarUrl: 'https://example.com/alex.jpg' });
  });
});
