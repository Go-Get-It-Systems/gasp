import { api } from '@/services/api';
import type { Reaction, ApiReaction } from '@/services/api/schemas/gasp.schema';
import { normalizeReaction } from '@/services/api/schemas/gasp.schema';

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
