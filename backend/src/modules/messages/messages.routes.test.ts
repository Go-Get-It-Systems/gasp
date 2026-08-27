import { beforeEach, describe, expect, test, vi } from 'vitest';
import Fastify from 'fastify';

vi.mock('../auth/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request: { user: unknown }) => {
    request.user = { userId: 'sender-1', role: 'user' };
  }),
}));

const mockSendMessage = vi.fn();
const mockGetConversationParticipants = vi.fn();
const mockSelectRecipients = vi.fn();
vi.mock('./messages.service.js', () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  getConversationParticipants: (...args: unknown[]) => mockGetConversationParticipants(...args),
  selectMessageNotificationRecipients: (...args: unknown[]) => mockSelectRecipients(...args),
  listMessages: vi.fn(),
  markConversationRead: vi.fn(),
}));

const mockGetUserById = vi.fn();
vi.mock('../users/users.service.js', () => ({
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
}));

const mockNotifyNewMessage = vi.fn();
vi.mock('../notifications/notifications.service.js', () => ({
  notifyNewMessage: (...args: unknown[]) => mockNotifyNewMessage(...args),
}));

const mockIo = { to: vi.fn() };
vi.mock('../../socket/index.js', () => ({
  getIO: () => mockIo,
}));

const mockEmitChatEvents = vi.fn();
vi.mock('../../socket/chat.events.js', () => ({
  emitChatEventsToParticipants: (...args: unknown[]) => mockEmitChatEvents(...args),
}));

import { messagesRoutes } from './messages.routes.js';

describe('POST /:conversationId/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage.mockResolvedValue({
      id: 'message-1',
      conversationId: 'conversation-1',
      senderId: 'sender-1',
      content: 'Hello',
      type: 'text',
      createdAt: '2026-08-06T00:00:00.000Z',
    });
    mockGetUserById.mockResolvedValue({
      id: 'sender-1',
      displayName: 'Sender',
      avatarUrl: 'https://example.com/sender.jpg',
    });
    mockGetConversationParticipants.mockResolvedValue([
      { userId: 'sender-1', displayName: 'Sender' },
      { userId: 'recipient-1', displayName: 'Recipient' },
    ]);
    mockSelectRecipients.mockReturnValue([{ userId: 'recipient-1', displayName: 'Recipient' }]);
    mockNotifyNewMessage.mockResolvedValue({ delivered: true });
  });

  test('fans out REST-created messages to participant personal rooms', async () => {
    const app = Fastify({ logger: false });
    await app.register(messagesRoutes, { prefix: '/conversations' });

    const response = await app.inject({
      method: 'POST',
      url: '/conversations/conversation-1/messages',
      payload: { content: 'Hello', type: 'text' },
    });

    expect(response.statusCode).toBe(201);
    expect(mockEmitChatEvents).toHaveBeenCalledWith(
      mockIo,
      ['sender-1', 'recipient-1'],
      expect.objectContaining({
        conversationId: 'conversation-1',
        actorName: 'Sender',
      }),
    );
    expect(mockNotifyNewMessage).toHaveBeenCalledWith(
      'recipient-1',
      'Sender',
      'Hello',
      'conversation-1',
      'sender-1',
      'message-1',
      'https://example.com/sender.jpg',
    );

    await app.close();
  });
});
