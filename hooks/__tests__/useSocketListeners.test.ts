/**
 * useSocketListeners Tests
 *
 * Verifies that socket event handlers correctly update the React Query cache
 * and trigger notification store actions for gasp events.
 */

import { useSocketListeners } from '@/hooks/useSocketListeners';
import type { Conversation, Message } from '@/services/api/schemas/chat.schema';
import type { Gasp } from '@/services/api/schemas/gasp.schema';
import { queryKeys } from '@/services/queryKeys';
import { renderHook } from '@testing-library/react-native';

// ── Capture maps for socket event handlers ─────────────────────────────────────

type Handler = (data: unknown) => void;
const capturedHandlers: Record<string, Handler> = {};

// ── Mock @/services/socket ──────────────────────────────────────────────────────

jest.mock('@/services/socket', () => ({
  getSocket: jest.fn(() => ({ connected: true })),
  onGaspReceived: jest.fn((handler: Handler) => {
    capturedHandlers['gasp:received'] = handler;
    return () => { delete capturedHandlers['gasp:received']; };
  }),
  onGaspViewed: jest.fn((handler: Handler) => {
    capturedHandlers['gasp:viewed'] = handler;
    return () => { delete capturedHandlers['gasp:viewed']; };
  }),
  onGaspReactionReceived: jest.fn((handler: Handler) => {
    capturedHandlers['gasp:reaction_received'] = handler;
    return () => { delete capturedHandlers['gasp:reaction_received']; };
  }),
  onGaspExpired: jest.fn((handler: Handler) => {
    capturedHandlers['gasp:expired'] = handler;
    return () => { delete capturedHandlers['gasp:expired']; };
  }),
  onGaspStatusUpdated: jest.fn((handler: Handler) => {
    capturedHandlers['gasp:status_updated'] = handler;
    return () => { delete capturedHandlers['gasp:status_updated']; };
  }),
  onNotificationEvent: jest.fn((handler: Handler) => {
    capturedHandlers['notification:event'] = handler;
    return () => { delete capturedHandlers['notification:event']; };
  }),
  onPresenceBulkStatus: jest.fn((handler: Handler) => {
    capturedHandlers['presence:bulk_status'] = handler;
    return () => {};
  }),
  onPresenceUserOnline: jest.fn((handler: Handler) => {
    capturedHandlers['presence:user_online'] = handler;
    return () => {};
  }),
  onPresenceUserOffline: jest.fn((handler: Handler) => {
    capturedHandlers['presence:user_offline'] = handler;
    return () => {};
  }),
  onChatNewMessage: jest.fn((handler: Handler) => {
    capturedHandlers['chat:new_message'] = handler;
    return () => {};
  }),
  onChatTyping: jest.fn((handler: Handler) => {
    capturedHandlers['chat:typing'] = handler;
    return () => {};
  }),
  onChatMessageRead: jest.fn((handler: Handler) => {
    capturedHandlers['chat:message_read'] = handler;
    return () => {};
  }),
  onChatConversationUpdated: jest.fn((handler: Handler) => {
    capturedHandlers['chat:conversation_updated'] = handler;
    return () => {};
  }),
}));

// ── Mock @/lib/queryClient ──────────────────────────────────────────────────────

const queryCache: Record<string, unknown> = {};

const mockSetQueryData = jest.fn((
  key: readonly string[],
  updater: unknown | ((current: unknown) => unknown),
) => {
  const keyStr = JSON.stringify(key);
  const current = queryCache[keyStr];
  const newValue = typeof updater === 'function' ? updater(current) : updater;
  queryCache[keyStr] = newValue;
  return newValue;
});

const mockGetQueryData = jest.fn((key: readonly string[]) => {
  return queryCache[JSON.stringify(key)];
});
const mockInvalidateQueries = jest.fn();

jest.mock('@/lib/queryClient', () => ({
  queryClient: {
    setQueryData: (key: readonly string[], updater: unknown) => mockSetQueryData(key, updater),
    getQueryData: (key: readonly string[]) => mockGetQueryData(key),
    invalidateQueries: (options: unknown) => mockInvalidateQueries(options),
  },
}));

// ── Mock @/hooks/queries/useChat ─────────────────────────────────────────────────

jest.mock('@/hooks/queries/useChat', () => ({
  addMessageToCache: jest.fn(),
}));

// ── Mock @/stores/authStore ──────────────────────────────────────────────────────

jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (s: { isAuthenticated: boolean; user: { id: string } }) => unknown) =>
      selector({ isAuthenticated: true, user: { id: 'user-123' } }),
    {
      getState: jest.fn(() => ({ user: { id: 'user-123' } })),
    },
  ),
}));

// ── Mock @/stores/chatStore ──────────────────────────────────────────────────────

let mockActiveConversationId: string | null = null;
const mockSetTypingUser = jest.fn();

jest.mock('@/stores/chatStore', () => ({
  useChatStore: {
    getState: jest.fn(() => ({
      activeConversationId: mockActiveConversationId,
      setTypingUser: mockSetTypingUser,
    })),
  },
}));

// ── Mock @/stores/gaspStore ──────────────────────────────────────────────────────

const mockAddReaction = jest.fn();

jest.mock('@/stores/gaspStore', () => ({
  useGaspStore: {
    getState: jest.fn(() => ({
      markGaspViewed: jest.fn(),
      addReaction: mockAddReaction,
    })),
  },
}));

// ── Mock @/stores/inboxStore ─────────────────────────────────────────────────────

jest.mock('@/stores/inboxStore', () => ({
  useInboxStore: {
    getState: jest.fn(() => ({
      setBulkOnlineStatus: jest.fn(),
      setFriendOnlineStatus: jest.fn(),
    })),
  },
}));

// ── Mock @/stores/notificationStore ──────────────────────────────────────────────

const mockEnqueueToast = jest.fn();
const mockTriggerTabPulse = jest.fn();
const mockSetInboxUnreadType = jest.fn();
const mockSetChatHasUnread = jest.fn();

jest.mock('@/stores/notificationStore', () => ({
  useNotificationStore: {
    getState: jest.fn(() => ({
      enqueueToast: mockEnqueueToast,
      triggerTabPulse: mockTriggerTabPulse,
      setInboxUnreadType: mockSetInboxUnreadType,
      setChatHasUnread: mockSetChatHasUnread,
    })),
  },
}));

// ── Test helpers ─────────────────────────────────────────────────────────────────

function makeGasp(overrides: Partial<Gasp> = {}): Gasp {
  return {
    id: 'gasp-1',
    senderId: 'sender-1',
    senderName: 'Alice',
    senderAvatarUrl: 'https://example.com/avatar.jpg',
    imageUrl: 'https://example.com/gasp.jpg',
    imageUri: 'https://example.com/gasp.jpg',
    mediaType: 'image',
    blurhash: 'LKO2?U%2Tw=w',
    replayable: false,
    status: 'pending',
    deliveryStatus: 'sent',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'sender-1',
    content: 'hello',
    type: 'text',
    createdAt: new Date().toISOString(),
    readAt: undefined,
    mediaUrl: undefined,
    replyToId: null,
    ...overrides,
  };
}

// ── Setup/Teardown ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Clear captured handlers
  Object.keys(capturedHandlers).forEach((key) => delete capturedHandlers[key]);
  // Clear query cache
  Object.keys(queryCache).forEach((key) => delete queryCache[key]);
  mockActiveConversationId = null;
  mockInvalidateQueries.mockClear();
});

// ── Tests ────────────────────────────────────────────────────────────────────────

describe('useSocketListeners', () => {
  describe('gasp:received event', () => {
    it('calls enqueueToast on the notification store with correct gaspId, senderName, imageUri', () => {
      renderHook(() => useSocketListeners());

      const gasp = makeGasp({
        id: 'gasp-abc',
        senderName: 'Bob',
        imageUri: 'https://cdn.example.com/image.jpg',
        blurhash: 'L6Pj0^i_.AyE_3t7t7R*',
      });

      capturedHandlers['gasp:received']({ gasp });

      expect(mockEnqueueToast).toHaveBeenCalledTimes(1);
      expect(mockEnqueueToast).toHaveBeenCalledWith({
        id: 'gasp-abc',
        kind: 'gasp.received',
        title: 'Bob',
        body: 'sent you a gasp',
        actorName: 'Bob',
        actorAvatarUrl: 'https://example.com/avatar.jpg',
        route: '/(modals)/view-gasp?gaspId=gasp-abc',
        gaspId: 'gasp-abc',
        imageUri: 'https://cdn.example.com/image.jpg',
        blurhash: 'L6Pj0^i_.AyE_3t7t7R*',
        mediaType: 'image',
      });
    });

    it('calls triggerTabPulse on the notification store', () => {
      renderHook(() => useSocketListeners());

      const gasp = makeGasp();

      capturedHandlers['gasp:received']({ gasp });

      expect(mockTriggerTabPulse).toHaveBeenCalledTimes(1);
    });

    it('does not duplicate pending cache or toast for the same gasp id', () => {
      const existing = makeGasp({ id: 'gasp-abc' });
      queryCache[JSON.stringify(queryKeys.gasps.pending)] = [existing];

      renderHook(() => useSocketListeners());

      capturedHandlers['gasp:received']({ gasp: makeGasp({ id: 'gasp-abc' }) });

      const pending = queryCache[JSON.stringify(queryKeys.gasps.pending)] as Gasp[];
      expect(pending).toEqual([existing]);
      expect(mockEnqueueToast).not.toHaveBeenCalled();
      expect(mockTriggerTabPulse).not.toHaveBeenCalled();
    });
  });

  describe('chat:new_message event', () => {
    it('increments unread and enqueues a toast when conversation is not active', () => {
      queryCache[JSON.stringify(queryKeys.conversations.all)] = [{
        id: 'conv-1',
        participantIds: ['user-1', 'sender-2'],
        participantNames: ['Current User', 'Alex'],
        participantAvatars: [null, 'https://example.com/alex.jpg'],
        unreadCount: 0,
        updatedAt: '2026-01-01T00:00:00.000Z',
        lastMessageAt: '2026-01-01T00:00:00.000Z',
        lastMessage: makeMessage({ id: 'old-msg' }),
      }];

      renderHook(() => useSocketListeners());

      capturedHandlers['chat:new_message']({
        conversationId: 'conv-1',
        message: makeMessage({ id: 'msg-2', senderId: 'sender-2', content: 'hi' }),
      });

      const conversations = queryCache[JSON.stringify(queryKeys.conversations.all)] as Conversation[];
      expect(conversations[0].unreadCount).toBe(1);
      expect(mockEnqueueToast).toHaveBeenCalledWith(expect.objectContaining({
        id: 'msg-2',
        kind: 'message.new',
        route: '/chat/conv-1?name=Alex&avatarUrl=https%3A%2F%2Fexample.com%2Falex.jpg',
      }));
      expect(mockSetChatHasUnread).toHaveBeenCalledWith(true);
    });

    it('does not increment unread or toast for active conversation', () => {
      mockActiveConversationId = 'conv-1';
      queryCache[JSON.stringify(queryKeys.conversations.all)] = [{
        id: 'conv-1',
        unreadCount: 0,
        updatedAt: '2026-01-01T00:00:00.000Z',
        lastMessage: null,
      }];

      renderHook(() => useSocketListeners());

      capturedHandlers['chat:new_message']({
        conversationId: 'conv-1',
        message: makeMessage({ id: 'msg-2', senderId: 'sender-2' }),
      });

      const conversations = queryCache[JSON.stringify(queryKeys.conversations.all)] as Conversation[];
      expect(conversations[0].unreadCount).toBe(0);
      expect(mockEnqueueToast).not.toHaveBeenCalled();
    });

    it('does not increment unread twice for duplicate last message', () => {
      const message = makeMessage({ id: 'msg-2', senderId: 'sender-2' });
      queryCache[JSON.stringify(queryKeys.conversations.all)] = [{
        id: 'conv-1',
        unreadCount: 1,
        updatedAt: message.createdAt,
        lastMessage: message,
      }];

      renderHook(() => useSocketListeners());

      capturedHandlers['chat:new_message']({ conversationId: 'conv-1', message });

      const conversations = queryCache[JSON.stringify(queryKeys.conversations.all)] as Conversation[];
      expect(conversations[0].unreadCount).toBe(1);
    });

    it('refreshes the conversation list when a first message belongs to an uncached conversation', () => {
      queryCache[JSON.stringify(queryKeys.conversations.all)] = [];
      renderHook(() => useSocketListeners());

      capturedHandlers['chat:new_message']({
        conversationId: 'new-conversation',
        message: makeMessage({ id: 'first-message', conversationId: 'new-conversation', senderId: 'sender-2' }),
        actorName: 'Alex',
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.conversations.all });
      expect(mockSetChatHasUnread).toHaveBeenCalledWith(true);
    });

    it.each(['gasp', 'reaction'] as const)('does not enqueue a second toast for %s chat messages', (type) => {
      queryCache[JSON.stringify(queryKeys.conversations.all)] = [{
        id: 'conv-1',
        unreadCount: 0,
        updatedAt: '2026-01-01T00:00:00.000Z',
        lastMessage: null,
      }];

      renderHook(() => useSocketListeners());

      capturedHandlers['chat:new_message']({
        conversationId: 'conv-1',
        message: makeMessage({ type, content: type === 'gasp' ? '[Gasp]' : 'Sent a reaction' }),
      });

      expect(mockEnqueueToast).not.toHaveBeenCalled();
      expect(mockSetChatHasUnread).toHaveBeenCalledWith(true);
    });
  });

  describe('gasp:reaction_received event', () => {
    it('normalizes the socket reaction timestamp before adding it to the inbox', () => {
      const createdAt = '2026-07-21T03:49:00.000Z';
      queryCache[JSON.stringify(queryKeys.gasps.sent)] = [makeGasp({
        id: 'gasp-1',
        imageUri: 'https://example.com/original.jpg',
      })];

      renderHook(() => useSocketListeners());

      capturedHandlers['gasp:reaction_received']({
        gaspId: 'gasp-1',
        reaction: {
          id: 'reaction-1',
          gaspId: 'gasp-1',
          reactorId: 'alex-1',
          videoUrl: 'https://example.com/reaction.mp4',
          createdAt,
        },
        conversationId: 'conv-1',
        reactionMessageId: 'message-1',
        actorName: 'Alex',
      });

      expect(mockAddReaction).toHaveBeenCalledWith({
        id: 'reaction-1',
        gaspId: 'gasp-1',
        reactorId: 'alex-1',
        reactorName: 'Alex',
        reactionVideoUri: 'https://example.com/reaction.mp4',
        originalImageUri: 'https://example.com/original.jpg',
        capturedAt: createdAt,
      });
      expect(mockEnqueueToast).toHaveBeenCalledWith(expect.objectContaining({
        id: 'reaction-1',
        title: 'Alex',
        body: 'reacted to your gasp',
      }));
    });
  });

  describe('notification:event', () => {
    it('enqueues actor-first friend request toast and refreshes pending requests', () => {
      renderHook(() => useSocketListeners());

      capturedHandlers['notification:event']({
        kind: 'friend.request',
        eventId: 'friendship-1',
        recipientId: 'user-123',
        actorId: 'alex-1',
        actorName: 'Alex',
        actorAvatarUrl: 'https://example.com/alex.jpg',
        title: 'Alex',
        body: 'sent you a friend request',
        route: '/(tabs)/inbox',
      });

      expect(mockEnqueueToast).toHaveBeenCalledWith(expect.objectContaining({
        id: 'friendship-1',
        kind: 'friend.request',
        title: 'Alex',
        body: 'sent you a friend request',
        route: '/(tabs)/inbox',
      }));
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.friends.requests });
    });

    it('enqueues friend accepted toast and refreshes friendship queries', () => {
      renderHook(() => useSocketListeners());

      capturedHandlers['notification:event']({
        kind: 'friend.accepted',
        eventId: 'friendship-1',
        recipientId: 'user-123',
        actorId: 'alex-1',
        actorName: 'Alex',
        title: 'Alex',
        body: 'accepted your request',
        route: '/(tabs)/chat',
      });

      expect(mockEnqueueToast).toHaveBeenCalledWith(expect.objectContaining({
        id: 'friendship-1',
        kind: 'friend.accepted',
        body: 'accepted your request',
        route: '/(tabs)/chat',
      }));
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.friends.all });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.friends.requests });
    });

    it('uses the same event id as the domain event so the toast store can dedupe it', () => {
      renderHook(() => useSocketListeners());

      capturedHandlers['gasp:reaction_received']({
        gaspId: 'gasp-1',
        reaction: {
          id: 'reaction-1',
          gaspId: 'gasp-1',
          reactorId: 'alex-1',
          videoUrl: 'https://example.com/reaction.mp4',
          createdAt: '2026-07-21T03:49:00.000Z',
        },
        conversationId: 'conv-1',
        reactionMessageId: 'message-1',
        actorName: 'Alex',
      });
      capturedHandlers['notification:event']({
        kind: 'gasp.reaction_received',
        eventId: 'reaction-1',
        reactionId: 'reaction-1',
        reactionMessageId: 'message-1',
        conversationId: 'conv-1',
        gaspId: 'gasp-1',
        recipientId: 'user-123',
        actorId: 'alex-1',
        actorName: 'Alex',
        title: 'Alex',
        body: 'reacted to your gasp',
        route: '/chat/conv-1',
      });

      expect(mockEnqueueToast.mock.calls[0][0].id).toBe('reaction-1');
      expect(mockEnqueueToast.mock.calls[1][0].id).toBe('reaction-1');
    });
  });

  describe('gasp:status_updated event', () => {
    it('updates deliveryStatus on the matching entry in the sent gasps cache', () => {
      const sentGasps: Gasp[] = [
        makeGasp({ id: 'gasp-1', deliveryStatus: 'sent' }),
        makeGasp({ id: 'gasp-2', deliveryStatus: 'sent' }),
        makeGasp({ id: 'gasp-3', deliveryStatus: 'delivered' }),
      ];
      queryCache[JSON.stringify(queryKeys.gasps.sent)] = sentGasps;

      renderHook(() => useSocketListeners());

      capturedHandlers['gasp:status_updated']({
        gaspId: 'gasp-2',
        deliveryStatus: 'opened',
      });

      const updatedCache = queryCache[JSON.stringify(queryKeys.gasps.sent)] as Gasp[];
      expect(updatedCache).toHaveLength(3);
      expect(updatedCache[0].deliveryStatus).toBe('sent');
      expect(updatedCache[1].deliveryStatus).toBe('opened');
      expect(updatedCache[2].deliveryStatus).toBe('delivered');
    });

    it('with an unknown gaspId leaves the cache unchanged', () => {
      const sentGasps: Gasp[] = [
        makeGasp({ id: 'gasp-1', deliveryStatus: 'sent' }),
        makeGasp({ id: 'gasp-2', deliveryStatus: 'delivered' }),
      ];
      queryCache[JSON.stringify(queryKeys.gasps.sent)] = sentGasps;

      renderHook(() => useSocketListeners());

      capturedHandlers['gasp:status_updated']({
        gaspId: 'gasp-unknown-999',
        deliveryStatus: 'opened',
      });

      const updatedCache = queryCache[JSON.stringify(queryKeys.gasps.sent)] as Gasp[];
      expect(updatedCache).toHaveLength(2);
      expect(updatedCache[0].deliveryStatus).toBe('sent');
      expect(updatedCache[1].deliveryStatus).toBe('delivered');
    });
  });

  describe('gasp:expired event', () => {
    it('removes the correct item from the pending gasps cache (regression guard)', () => {
      const pendingGasps: Gasp[] = [
        makeGasp({ id: 'gasp-a' }),
        makeGasp({ id: 'gasp-b' }),
        makeGasp({ id: 'gasp-c' }),
      ];
      queryCache[JSON.stringify(queryKeys.gasps.pending)] = pendingGasps;

      renderHook(() => useSocketListeners());

      capturedHandlers['gasp:expired']({ gaspId: 'gasp-b' });

      const updatedCache = queryCache[JSON.stringify(queryKeys.gasps.pending)] as Gasp[];
      expect(updatedCache).toHaveLength(2);
      expect(updatedCache.map((g) => g.id)).toEqual(['gasp-a', 'gasp-c']);
    });
  });
});
