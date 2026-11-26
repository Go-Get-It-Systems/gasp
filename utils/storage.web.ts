import AsyncStorage from '@react-native-async-storage/async-storage';
import { writeSessionValue } from './sessionStorageQueue';

const KEYS = {
  AUTH_TOKEN: 'gasp_auth_token',
  USER_DATA: 'gasp_user_data',
  ONBOARDING_COMPLETE: 'gasp_onboarding_complete',
} as const;

type StorageKey = (typeof KEYS)[keyof typeof KEYS];
interface MemoryEntry {
  value: string | null;
  pending: boolean;
}

// AsyncStorage uses localStorage on web. This is browser persistence, not encrypted
// SecureStore. Memory keeps this page usable when browser storage is unavailable.
const memory = new Map<StorageKey, MemoryEntry>();

async function readValue(key: StorageKey): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const previous = memory.get(key);
  if (previous?.pending) return previous.value;

  try {
    const value = await AsyncStorage.getItem(key);
    const current = memory.get(key);
    // A newer write or logout wins over a read that was already in flight.
    if (current !== previous) return current?.value ?? null;
    memory.set(key, { value, pending: false });
    return value;
  } catch {
    return memory.get(key)?.value ?? null;
  }
}

async function writeValue(key: StorageKey, value: string | null): Promise<void> {
  if (typeof window === 'undefined') return;

  const entry: MemoryEntry = { value, pending: true };
  memory.set(key, entry);
  try {
    await writeSessionValue(key, async () => {
      if (value === null) await AsyncStorage.removeItem(key);
      else await AsyncStorage.setItem(key, value);
    });
    if (memory.get(key) === entry) entry.pending = false;
  } catch {
    // Keep the pending value, including a logout tombstone, authoritative for
    // this page. Failed storage operations must not restore an older session.
  }
}

export async function getAuthToken(): Promise<string | null> {
  return readValue(KEYS.AUTH_TOKEN);
}

export async function setAuthToken(token: string): Promise<void> {
  await writeValue(KEYS.AUTH_TOKEN, token);
}

export async function removeAuthToken(): Promise<void> {
  await writeValue(KEYS.AUTH_TOKEN, null);
}

export async function getUserData(): Promise<string | null> {
  return readValue(KEYS.USER_DATA);
}

export async function setUserData(data: string): Promise<void> {
  await writeValue(KEYS.USER_DATA, data);
}

export async function removeUserData(): Promise<void> {
  await writeValue(KEYS.USER_DATA, null);
}

export async function getOnboardingComplete(): Promise<boolean> {
  return (await readValue(KEYS.ONBOARDING_COMPLETE)) === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await writeValue(KEYS.ONBOARDING_COMPLETE, 'true');
}
