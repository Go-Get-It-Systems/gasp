jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadProductUpdateUserState,
  productUpdatesStorageKey,
  saveProductUpdateUserState,
} from '@/services/productUpdatesStorage';

describe('product update storage', () => {
  beforeEach(() => {
    jest.mocked(AsyncStorage.getItem).mockReset();
    jest.mocked(AsyncStorage.setItem).mockReset();
  });

  it('scopes state by user and version', () => {
    expect(productUpdatesStorageKey('person-1')).toBe('gasp:product-updates:v1:person-1');
  });

  it('returns a safe empty state when storage is missing or malformed', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce('{not-json');

    await expect(loadProductUpdateUserState('person-1')).resolves.toEqual({ readUpdateIds: [], feedbackByUpdateId: {} });
    await expect(loadProductUpdateUserState('person-1')).resolves.toEqual({ readUpdateIds: [], feedbackByUpdateId: {} });
  });

  it('loads valid state and persists the exact payload for the current user', async () => {
    const state = { readUpdateIds: ['update-1'], feedbackByUpdateId: { 'update-1': true } };
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(state));

    await expect(loadProductUpdateUserState('person-1')).resolves.toEqual(state);
    await saveProductUpdateUserState('person-1', state);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('gasp:product-updates:v1:person-1', JSON.stringify(state));
  });

  it('does not block the experience when persistence fails', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk unavailable'));

    await expect(saveProductUpdateUserState('person-1', { readUpdateIds: [], feedbackByUpdateId: {} })).resolves.toBeUndefined();
  });
});
