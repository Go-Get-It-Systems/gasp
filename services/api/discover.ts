import { api } from '@/services/api';
import type { RecommendedUser } from '@/services/api/schemas/user.schema';

export async function getRecommendedUsers(): Promise<RecommendedUser[]> {
  const res = await api.get<RecommendedUser[]>('/users/recommended');
  return res.data;
}

export async function getTopGaspers(): Promise<RecommendedUser[]> {
  const res = await api.get<RecommendedUser[]>('/users/top-gaspers');
  return res.data;
}
