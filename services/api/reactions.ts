import { api } from '@/services/api';
import type { Reaction, ApiReaction, ReactionReturn } from '@/services/api/schemas/gasp.schema';
import { ReactionReturnSchema, normalizeReaction } from '@/services/api/schemas/gasp.schema';
import { PaginatedResponseSchema, validateResponse, type PaginatedResponse } from '@/services/api/schemas/common.schema';

export async function createReaction(data: {
  gaspId: string;
  videoUrl: string;
}): Promise<Reaction> {
  const res = await api.post<ApiReaction>('/reactions', data);
  return normalizeReaction(res.data);
}

export async function getReactions(gaspId: string): Promise<Reaction[]> {
  const res = await api.get<ApiReaction[]>(`/reactions/gasps/${gaspId}`);
  return res.data.map(normalizeReaction);
}

export async function getReceivedReactions(cursor?: string): Promise<PaginatedResponse<ReactionReturn>> {
  const res = await api.get<unknown>('/reactions/received', {
    params: { cursor, limit: 20 },
  });
  return validateResponse(
    PaginatedResponseSchema(ReactionReturnSchema),
    res.data,
    'getReceivedReactions',
  );
}
