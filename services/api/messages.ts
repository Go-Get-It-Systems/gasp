import { api } from '@/services/api';
import type { PaginatedResponse } from '@/services/api/schemas/common.schema';
import type { Message, MessageType } from '@/services/api/schemas/chat.schema';

export async function listMessages(
  conversationId: string,
  params?: {
    cursor?: string;
    limit?: number;
    direction?: 'older' | 'newer';
  },
): Promise<PaginatedResponse<Message>> {
  const res = await api.get<PaginatedResponse<Message>>(
    `/conversations/${conversationId}/messages`,
    { params },
  );
  return res.data;
}

export async function sendMessage(
  conversationId: string,
  data: {
    content: string;
    type?: MessageType;
    mediaUrl?: string;
    replyToId?: string;
  },
): Promise<Message> {
  const res = await api.post<Message>(
    `/conversations/${conversationId}/messages`,
    data,
  );
  return res.data;
}

export async function markRead(conversationId: string): Promise<void> {
  await api.patch(`/conversations/${conversationId}/read`);
}
