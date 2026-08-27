import {
  filterConversations,
  formatConversationTime,
  getConversationParticipant,
  getConversationPreview,
} from '@/components/chat/conversationPreview';
import type { Conversation, Message } from '@/services/api/schemas/chat.schema';

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'message-1',
    conversationId: 'conversation-1',
    senderId: 'friend-1',
    content: 'Hello',
    type: 'text',
    createdAt: '2026-08-01T12:00:00.000Z',
    ...overrides,
  };
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conversation-1',
    participantIds: ['current-user', 'friend-1'],
    participantNames: ['Current User', 'Marina'],
    participantAvatars: [null, 'https://example.com/marina.jpg'],
    unreadCount: 0,
    updatedAt: '2026-08-01T12:00:00.000Z',
    lastMessageAt: '2026-08-01T12:00:00.000Z',
    lastMessage: makeMessage(),
    ...overrides,
  };
}

describe('conversationPreview helpers', () => {
  it('resolves the other participant with their avatar', () => {
    expect(getConversationParticipant(makeConversation(), 'current-user')).toEqual({
      id: 'friend-1',
      name: 'Marina',
      avatarUrl: 'https://example.com/marina.jpg',
    });
  });

  it.each([
    ['text', { kind: 'text', text: 'Hello' }],
    ['gasp', { kind: 'translation', key: 'chat.inbox.sentGasp' }],
    ['reaction', { kind: 'translation', key: 'chat.inbox.reactedToGasp' }],
    ['image', { kind: 'translation', key: 'chat.inbox.sentPhoto' }],
  ] as const)('maps %s messages to safe inbox preview data', (type, expected) => {
    expect(getConversationPreview(makeMessage({ type }))).toEqual(expected);
  });

  it('uses a translation fallback when a conversation has no last message', () => {
    expect(getConversationPreview()).toEqual({
      kind: 'translation',
      key: 'chat.inbox.startConversation',
    });
  });

  it('orders recent conversations and filters by participant name', () => {
    const marina = makeConversation({ id: 'marina', updatedAt: '2026-08-01T12:00:00.000Z' });
    const lucas = makeConversation({
      id: 'lucas',
      participantIds: ['current-user', 'friend-2'],
      participantNames: ['Current User', 'Lucas'],
      participantAvatars: [null, null],
      updatedAt: '2026-08-02T12:00:00.000Z',
      lastMessageAt: '2026-08-02T12:00:00.000Z',
    });

    expect(filterConversations([marina, lucas], '', 'current-user').map(({ id }) => id)).toEqual([
      'lucas',
      'marina',
    ]);
    expect(filterConversations([marina, lucas], 'mar', 'current-user').map(({ id }) => id)).toEqual([
      'marina',
    ]);
  });

  it('formats current, minute, hour, day, and invalid timestamps safely', () => {
    const now = Date.parse('2026-08-01T12:00:00.000Z');

    expect(formatConversationTime('2026-08-01T11:59:30.000Z', now)).toBe('now');
    expect(formatConversationTime('2026-08-01T11:58:00.000Z', now)).toBe('2m');
    expect(formatConversationTime('2026-08-01T09:00:00.000Z', now)).toBe('3h');
    expect(formatConversationTime('2026-07-29T12:00:00.000Z', now)).toBe('3d');
    expect(formatConversationTime('invalid', now)).toBe('');
  });
});
