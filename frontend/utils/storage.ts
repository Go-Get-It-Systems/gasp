import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  AUTH_TOKEN: 'gasp_auth_token',
  USER_DATA: 'gasp_user_data',
  ONBOARDING_COMPLETE: 'gasp_onboarding_complete',
} as const;

// expo-secure-store is not available on web — fall back to localStorage.
// NOTE: localStorage is NOT secure; treat web as a dev/preview convenience only.

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAuthToken(): Promise<string | null> {
  return getItem(KEYS.AUTH_TOKEN);
}

export async function setAuthToken(token: string): Promise<void> {
  await setItem(KEYS.AUTH_TOKEN, token);
}

export async function removeAuthToken(): Promise<void> {
  await deleteItem(KEYS.AUTH_TOKEN);
}

export async function getUserData(): Promise<string | null> {
  return getItem(KEYS.USER_DATA);
}

export async function setUserData(data: string): Promise<void> {
  await setItem(KEYS.USER_DATA, data);
}

export async function removeUserData(): Promise<void> {
  await deleteItem(KEYS.USER_DATA);
}

export async function getOnboardingComplete(): Promise<boolean> {
  const value = await getItem(KEYS.ONBOARDING_COMPLETE);
  return value === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await setItem(KEYS.ONBOARDING_COMPLETE, 'true');
}
