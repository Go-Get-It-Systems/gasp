import { api } from '@/services/api';
import {
  PaginatedResponseSchema,
  validateResponse,
  type PaginatedResponse,
} from '@/services/api/schemas/common.schema';
import {
  ConversationResponseSchema,
  type Conversation,
} from '@/services/api/schemas/chat.schema';

export async function listConversations(params?: {
  cursor?: string;
  limit?: number;
}): Promise<PaginatedResponse<Conversation>> {
  const res = await api.get<PaginatedResponse<Conversation>>('/conversations', {
    params,
  });
  return validateResponse(
    PaginatedResponseSchema(ConversationResponseSchema),
    res.data,
    'listConversations',
  );
}

export async function getOrCreateConversation(
  participantId: string,
): Promise<Conversation> {
  const res = await api.post<Conversation>('/conversations', { participantId });
  return validateResponse(
    ConversationResponseSchema,
    res.data,
    'getOrCreateConversation',
  );
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await api.get<Conversation>(`/conversations/${id}`);
  return validateResponse(ConversationResponseSchema, res.data, 'getConversation');
}
