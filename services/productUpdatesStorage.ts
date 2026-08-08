import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { ProductUpdateUserStateSchema, type ProductUpdateUserState } from '@/services/api/schemas/productUpdate.schema';
import { emptyProductUpdateState } from '@/services/productUpdates';

const STORAGE_KEY_PREFIX = 'gasp:product-updates:v1';

export function productUpdatesStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

export async function loadProductUpdateUserState(userId: string): Promise<ProductUpdateUserState> {
  if (!userId) return emptyProductUpdateState();

  try {
    const rawState = await AsyncStorage.getItem(productUpdatesStorageKey(userId));
    if (!rawState) return emptyProductUpdateState();
    const parsedState = ProductUpdateUserStateSchema.safeParse(JSON.parse(rawState));
    return parsedState.success ? parsedState.data : emptyProductUpdateState();
  } catch (error) {
    Sentry.captureException(error, { extra: { context: 'loadProductUpdateUserState' } });
    return emptyProductUpdateState();
  }
}

export async function saveProductUpdateUserState(userId: string, state: ProductUpdateUserState): Promise<void> {
  if (!userId) return;

  try {
    await AsyncStorage.setItem(productUpdatesStorageKey(userId), JSON.stringify(state));
  } catch (error) {
    Sentry.captureException(error, { extra: { context: 'saveProductUpdateUserState' } });
  }
}
