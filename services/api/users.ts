import { api } from '@/services/api';
import {
  UpdateProfileInputSchema,
  UserSchema,
  type UpdateProfileInput,
  type User,
  type UserStats,
} from '@/services/api/schemas/user.schema';
import { validateResponse } from '@/services/api/schemas/common.schema';

export async function getMe(): Promise<User> {
  const res = await api.get<User>('/users/me');
  return res.data;
}

export async function getMyStats(): Promise<UserStats> {
  const res = await api.get<UserStats>('/users/me/stats');
  return res.data;
}

export async function updateMe(data: UpdateProfileInput): Promise<User> {
  const input = UpdateProfileInputSchema.parse(data);
  const res = await api.patch<unknown>('/users/me', input);
  return validateResponse(UserSchema, res.data, 'updateMe');
}

export async function searchUsers(query: string): Promise<User[]> {
  const res = await api.get<User[]>('/users/search', {
    params: { q: query },
  });
  return res.data;
}

export async function getUserById(id: string): Promise<User> {
  const res = await api.get<User>(`/users/${id}`);
  return res.data;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const res = await api.get<UserStats>(`/users/${userId}/stats`);
  return res.data;
}
