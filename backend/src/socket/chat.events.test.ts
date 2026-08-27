import { describe, expect, test, vi } from 'vitest';
import { emitChatEventsToParticipants, type ChatEventServer } from './chat.events.js';

describe('emitChatEventsToParticipants', () => {
  test('fans out one message and conversation update to each unique personal room', () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    const io: ChatEventServer = { to };
    const message = { id: 'message-1', content: 'Hello' };

    emitChatEventsToParticipants(io, ['sender-1', 'recipient-1', 'recipient-1'], {
      conversationId: 'conversation-1',
      message,
      actorName: 'Sender',
    });

    expect(to).toHaveBeenCalledTimes(2);
    expect(to).toHaveBeenNthCalledWith(1, 'user:sender-1');
    expect(to).toHaveBeenNthCalledWith(2, 'user:recipient-1');
    expect(emit).toHaveBeenCalledTimes(4);
    expect(emit).toHaveBeenCalledWith('chat:new_message', {
      conversationId: 'conversation-1',
      message,
      actorName: 'Sender',
    });
    expect(emit).toHaveBeenCalledWith('chat:conversation_updated', {
      conversationId: 'conversation-1',
      lastMessage: message,
    });
  });
});
