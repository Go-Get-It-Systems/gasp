import { api } from '@/services/api';
import { listConversations } from '@/services/api/conversations';

jest.mock('@/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedGet = api.get as jest.Mock;

describe('conversations API', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('normalizes backend participants before adding conversations to the query cache', async () => {
    mockedGet.mockResolvedValue({
      data: {
        data: [{
          id: 'conv-1',
          participants: [
            { userId: 'me', displayName: 'Me', username: 'me', avatarUrl: null },
            { userId: 'alex', displayName: 'Alex', username: 'alex', avatarUrl: 'https://example.com/alex.jpg' },
          ],
          lastMessage: {
            id: 'message-1',
            conversationId: 'conv-1',
            senderId: 'alex',
            content: 'Hello',
            type: 'text',
            mediaUrl: null,
            replyToId: null,
            readAt: null,
            createdAt: '2026-07-21T00:00:00.000Z',
          },
          unreadCount: 1,
          updatedAt: '2026-07-21T00:00:00.000Z',
        }],
        nextCursor: null,
        hasMore: false,
      },
    });

    await expect(listConversations()).resolves.toEqual({
      data: [{
        id: 'conv-1',
        participantIds: ['me', 'alex'],
        participantNames: ['Me', 'Alex'],
        participantAvatars: [null, 'https://example.com/alex.jpg'],
        lastMessage: {
          id: 'message-1',
          conversationId: 'conv-1',
          senderId: 'alex',
          content: 'Hello',
          type: 'text',
          replyToId: null,
          createdAt: '2026-07-21T00:00:00.000Z',
        },
        unreadCount: 1,
        updatedAt: '2026-07-21T00:00:00.000Z',
      }],
      nextCursor: null,
      hasMore: false,
    });
  });
});
