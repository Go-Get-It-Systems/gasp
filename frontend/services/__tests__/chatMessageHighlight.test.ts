import { findMessageIndex } from '@/services/chatMessageHighlight';
import type { Message } from '@/services/api/schemas/chat.schema';

const messages = [
  { id: 'message-1' },
  { id: 'reaction-message-1' },
] as Message[];

describe('findMessageIndex', () => {
  it('locates the reaction message supplied by the notification route', () => {
    expect(findMessageIndex(messages, 'reaction-message-1')).toBe(1);
  });

  it('does not target a message when the route is missing or stale', () => {
    expect(findMessageIndex(messages)).toBe(-1);
    expect(findMessageIndex(messages, 'missing-message')).toBe(-1);
  });
});
