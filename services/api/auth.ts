import { api } from '@/services/api';
import type { User } from '@/services/api/schemas/user.schema';

interface AuthResponse {
  user: User;
  token: string;
}

interface RefreshResponse {
  token: string;
}

export async function register(data: {
  firebaseToken: string;
  displayName: string;
  username: string;
  accountType?: 'personal' | 'business';
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', data);
  return res.data;
}

export async function login(firebaseToken: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', { firebaseToken });
  return res.data;
}

export async function refreshToken(): Promise<RefreshResponse> {
  const res = await api.post<RefreshResponse>('/auth/refresh');
  return res.data;
}

export async function registerDevice(data: {
  fcmToken: string;
  platform: 'ios' | 'android';
  deviceId?: string;
}): Promise<void> {
  await api.post('/auth/devices', data);
}

export async function removeDevice(token: string): Promise<void> {
  await api.delete(`/auth/devices/${encodeURIComponent(token)}`);
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
