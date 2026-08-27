import type { Message } from '@/services/api/schemas/chat.schema';

export function findMessageIndex(messages: Message[], messageId?: string) {
  if (!messageId) return -1;
  return messages.findIndex((message) => message.id === messageId);
}
