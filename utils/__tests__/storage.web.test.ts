import * as SecureStore from 'expo-secure-store';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
    removeItem: (key: string) => mockRemoveItem(key),
  },
}));

type WebStorage = typeof import('../storage.web');

describe('web storage', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let storage: WebStorage;
  let persisted: Map<string, string>;
  let browserStorage: Storage;

  function loadStorage(): WebStorage {
    let loaded: WebStorage | undefined;
    jest.isolateModules(() => {
      loaded = jest.requireActual<WebStorage>('../storage.web');
    });
    if (!loaded) throw new Error('Web storage module was not loaded');
    return loaded;
  }

  function setBrowserStorage(value: Storage): void {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: { localStorage: value },
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    persisted = new Map();
    browserStorage = {
      get length() { return persisted.size; },
      clear: jest.fn(() => persisted.clear()),
      key: jest.fn((index: number) => [...persisted.keys()][index] ?? null),
      getItem: jest.fn((key: string) => persisted.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => { persisted.set(key, value); }),
      removeItem: jest.fn((key: string) => { persisted.delete(key); }),
    };
    setBrowserStorage(browserStorage);
    mockGetItem.mockImplementation(async (key: string) => window.localStorage.getItem(key));
    mockSetItem.mockImplementation(async (key: string, value: string) => {
      window.localStorage.setItem(key, value);
    });
    mockRemoveItem.mockImplementation(async (key: string) => {
      window.localStorage.removeItem(key);
    });
    storage = loadStorage();
  });

  afterAll(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
  });

  it('keeps the native module contract and persists all values with the existing keys', async () => {
    const nativeContract: typeof import('../storage') = storage;
    await nativeContract.setAuthToken('token');
    await storage.setUserData('{"id":"user-1"}');
    await storage.setOnboardingComplete();

    expect(persisted).toEqual(new Map([
      ['gasp_auth_token', 'token'],
      ['gasp_user_data', '{"id":"user-1"}'],
      ['gasp_onboarding_complete', 'true'],
    ]));
    expect(await storage.getAuthToken()).toBe('token');
    expect(await storage.getUserData()).toBe('{"id":"user-1"}');
    expect(await storage.getOnboardingComplete()).toBe(true);
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('restores persisted values after a page reload', async () => {
    await storage.setAuthToken('saved-token');
    await storage.setUserData('saved-user');
    await storage.setOnboardingComplete();

    const reloaded = loadStorage();
    expect(await reloaded.getAuthToken()).toBe('saved-token');
    expect(await reloaded.getUserData()).toBe('saved-user');
    expect(await reloaded.getOnboardingComplete()).toBe(true);
  });

  it('removes only session keys on logout and keeps logout after reload', async () => {
    await storage.setAuthToken('token');
    await storage.setUserData('user');
    await storage.setOnboardingComplete();
    persisted.set('unrelated-key', 'keep');

    await storage.removeAuthToken();
    await storage.removeUserData();

    const reloaded = loadStorage();
    expect(await reloaded.getAuthToken()).toBeNull();
    expect(await reloaded.getUserData()).toBeNull();
    expect(await reloaded.getOnboardingComplete()).toBe(true);
    expect(persisted.get('unrelated-key')).toBe('keep');
    expect(browserStorage.clear).not.toHaveBeenCalled();
  });

  it('does not erase persisted data when a browser storage getter is blocked', async () => {
    persisted.set('gasp_auth_token', 'keep-token');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => { throw new Error('Storage access blocked'); },
    });

    expect(await storage.getAuthToken()).toBeNull();
    expect(persisted.get('gasp_auth_token')).toBe('keep-token');
    expect(mockRemoveItem).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();

    setBrowserStorage(browserStorage);
    expect(await storage.getAuthToken()).toBe('keep-token');
  });

  it('uses memory for writes and onboarding when browser storage is blocked', async () => {
    mockGetItem.mockRejectedValue(new Error('Storage blocked'));
    mockSetItem.mockRejectedValue(new Error('Storage blocked'));
    mockRemoveItem.mockRejectedValue(new Error('Storage blocked'));

    await storage.setAuthToken('memory-token');
    await storage.setUserData('memory-user');
    await storage.setOnboardingComplete();
    expect(await storage.getAuthToken()).toBe('memory-token');
    expect(await storage.getUserData()).toBe('memory-user');
    expect(await storage.getOnboardingComplete()).toBe(true);

    await storage.removeAuthToken();
    await storage.removeUserData();
    expect(await storage.getAuthToken()).toBeNull();
    expect(await storage.getUserData()).toBeNull();
    expect(persisted.size).toBe(0);
  });

  it('keeps a newer memory token when a write fails but the old persisted token is readable', async () => {
    persisted.set('gasp_auth_token', 'old-token');
    mockSetItem.mockRejectedValueOnce(new Error('Quota exceeded'));

    await storage.setAuthToken('new-token');

    expect(await storage.getAuthToken()).toBe('new-token');
    expect(persisted.get('gasp_auth_token')).toBe('old-token');
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  it('does not resurrect a persisted token after a failed logout removal', async () => {
    persisted.set('gasp_auth_token', 'old-token');
    expect(await storage.getAuthToken()).toBe('old-token');
    mockRemoveItem.mockRejectedValueOnce(new Error('Storage blocked'));

    await storage.removeAuthToken();

    expect(await storage.getAuthToken()).toBeNull();
    expect(persisted.get('gasp_auth_token')).toBe('old-token');
  });

  it('uses the last successfully read value on a transient read failure', async () => {
    persisted.set('gasp_auth_token', 'saved-token');
    expect(await storage.getAuthToken()).toBe('saved-token');
    mockGetItem.mockRejectedValueOnce(new Error('Storage blocked'));

    expect(await storage.getAuthToken()).toBe('saved-token');
    expect(persisted.get('gasp_auth_token')).toBe('saved-token');
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  it('observes session removal from another tab when storage is available', async () => {
    persisted.set('gasp_auth_token', 'token');
    expect(await storage.getAuthToken()).toBe('token');
    persisted.delete('gasp_auth_token');

    expect(await storage.getAuthToken()).toBeNull();
  });

  it('does not let an older in-flight read overwrite logout', async () => {
    let resolveRead: ((value: string | null) => void) | undefined;
    mockGetItem.mockImplementationOnce(() => new Promise<string | null>((resolve) => {
      resolveRead = resolve;
    }));

    const reading = storage.getAuthToken();
    await storage.removeAuthToken();
    resolveRead?.('stale-token');

    expect(await reading).toBeNull();
    expect(await storage.getAuthToken()).toBeNull();
  });

  it('does not read or retain request data during SSR without window', async () => {
    Reflect.deleteProperty(globalThis, 'window');
    await storage.setAuthToken('server-token');
    await storage.setUserData('server-user');
    await storage.setOnboardingComplete();
    await storage.removeAuthToken();
    await storage.removeUserData();

    expect(await storage.getAuthToken()).toBeNull();
    expect(await storage.getUserData()).toBeNull();
    expect(await storage.getOnboardingComplete()).toBe(false);
    expect(mockGetItem).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();

    setBrowserStorage(browserStorage);
    mockGetItem.mockRejectedValue(new Error('Storage blocked'));
    expect(await storage.getAuthToken()).toBeNull();
    expect(await storage.getUserData()).toBeNull();
    expect(await storage.getOnboardingComplete()).toBe(false);
  });
});
