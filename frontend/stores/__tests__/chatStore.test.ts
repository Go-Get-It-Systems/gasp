import { useChatStore } from '@/stores/chatStore';

jest.mock('@/services/socket', () => ({
  chatSendMessage: jest.fn(),
  chatStartTyping: jest.fn(),
  chatStopTyping: jest.fn(),
  getSocket: jest.fn(() => null),
}));

import * as socket from '@/services/socket';

// ── Setup / teardown ──────────────────────────────────────────────────────

beforeEach(() => {
  useChatStore.setState({
    activeConversationId: null,
    typingUsers: [],
  });

  jest.clearAllMocks();
});

// ── setActiveConversation ─────────────────────────────────────────────────

describe('setActiveConversation', () => {
  it('sets the active conversation id', () => {
    useChatStore.getState().setActiveConversation('conv-1');
    expect(useChatStore.getState().activeConversationId).toBe('conv-1');
  });

  it('clears the active conversation when passed null', () => {
    useChatStore.setState({ activeConversationId: 'conv-1' });
    useChatStore.getState().setActiveConversation(null);
    expect(useChatStore.getState().activeConversationId).toBeNull();
  });
});

// ── setTypingUser ─────────────────────────────────────────────────────────

describe('setTypingUser', () => {
  it('adds a typing user', () => {
    useChatStore.getState().setTypingUser('conv-1', 'user-2', true);

    const typingUsers = useChatStore.getState().typingUsers;
    expect(typingUsers).toEqual([{ conversationId: 'conv-1', userId: 'user-2' }]);
  });

  it('removes a typing user when isTyping is false', () => {
    useChatStore.setState({
      typingUsers: [{ conversationId: 'conv-1', userId: 'user-2' }],
    });

    useChatStore.getState().setTypingUser('conv-1', 'user-2', false);

    expect(useChatStore.getState().typingUsers).toEqual([]);
  });

  it('does not duplicate typing users', () => {
    useChatStore.getState().setTypingUser('conv-1', 'user-2', true);
    useChatStore.getState().setTypingUser('conv-1', 'user-2', true);

    const typingUsers = useChatStore.getState().typingUsers;
    expect(typingUsers).toHaveLength(1);
  });

  it('handles multiple typing users in different conversations independently', () => {
    useChatStore.getState().setTypingUser('conv-1', 'user-2', true);
    useChatStore.getState().setTypingUser('conv-2', 'user-3', true);

    const typingUsers = useChatStore.getState().typingUsers;
    expect(typingUsers).toHaveLength(2);
    expect(typingUsers).toContainEqual({ conversationId: 'conv-1', userId: 'user-2' });
    expect(typingUsers).toContainEqual({ conversationId: 'conv-2', userId: 'user-3' });
  });

  it('only removes the matching user/conversation pair', () => {
    useChatStore.setState({
      typingUsers: [
        { conversationId: 'conv-1', userId: 'user-2' },
        { conversationId: 'conv-1', userId: 'user-3' },
      ],
    });

    useChatStore.getState().setTypingUser('conv-1', 'user-2', false);

    const typingUsers = useChatStore.getState().typingUsers;
    expect(typingUsers).toHaveLength(1);
    expect(typingUsers[0]).toEqual({ conversationId: 'conv-1', userId: 'user-3' });
  });
});

// ── sendMessage ───────────────────────────────────────────────────────────

describe('sendMessage', () => {
  it('calls chatSendMessage with the correct arguments', () => {
    useChatStore.getState().sendMessage('conv-1', 'Hello', 'text');

    expect(socket.chatSendMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      content: 'Hello',
      type: 'text',
      mediaUrl: undefined,
      replyToId: undefined,
    });
  });

  it('defaults type to "text" when not provided', () => {
    useChatStore.getState().sendMessage('conv-1', 'Hi');

    expect(socket.chatSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text' }),
    );
  });
});

// ── startTyping / stopTyping ──────────────────────────────────────────────

describe('startTyping / stopTyping', () => {
  it('calls chatStartTyping with the conversationId', () => {
    useChatStore.getState().startTyping('conv-1');
    expect(socket.chatStartTyping).toHaveBeenCalledWith('conv-1');
  });

  it('calls chatStopTyping with the conversationId', () => {
    useChatStore.getState().stopTyping('conv-1');
    expect(socket.chatStopTyping).toHaveBeenCalledWith('conv-1');
  });
});
