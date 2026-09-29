import { api } from '@/services/api';

export async function registerDevice(
  token: string,
  platform: 'ios' | 'android'
): Promise<void> {
  await api.post('/auth/devices', { fcmToken: token, platform, deviceId: token });
}
