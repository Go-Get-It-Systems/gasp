import * as SecureStore from 'expo-secure-store';
import { writeSessionValue } from './sessionStorageQueue';

const KEYS = {
  AUTH_TOKEN: 'gasp_auth_token',
  USER_DATA: 'gasp_user_data',
  ONBOARDING_COMPLETE: 'gasp_onboarding_complete',
} as const;

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.AUTH_TOKEN);
}

export async function setAuthToken(token: string): Promise<void> {
  await writeSessionValue(KEYS.AUTH_TOKEN, () => SecureStore.setItemAsync(KEYS.AUTH_TOKEN, token));
}

export async function removeAuthToken(): Promise<void> {
  await writeSessionValue(KEYS.AUTH_TOKEN, () => SecureStore.deleteItemAsync(KEYS.AUTH_TOKEN));
}

export async function getUserData(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.USER_DATA);
}

export async function setUserData(data: string): Promise<void> {
  await writeSessionValue(KEYS.USER_DATA, () => SecureStore.setItemAsync(KEYS.USER_DATA, data));
}

export async function removeUserData(): Promise<void> {
  await writeSessionValue(KEYS.USER_DATA, () => SecureStore.deleteItemAsync(KEYS.USER_DATA));
}

export async function getOnboardingComplete(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(KEYS.ONBOARDING_COMPLETE);
  return value === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ONBOARDING_COMPLETE, 'true');
}
