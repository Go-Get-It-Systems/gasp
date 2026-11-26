const mockGetApps = jest.fn();
const mockInitializeApp = jest.fn();
const mockGetAuth = jest.fn();
const mockConnectAuthEmulator = jest.fn();
const mockCreateVerifier = jest.fn();
const mockSignInWithPhoneNumber = jest.fn();
const mockSignInWithCredential = jest.fn();
const mockGetIdToken = jest.fn();
const mockCredential = jest.fn();
const mockSignOut = jest.fn();

// Never load Firebase or its networking in these tests.
jest.mock('@react-native-firebase/app/dist/module/internal/web/firebaseAuth', () => ({
  connectAuthEmulator: (...args: unknown[]) => mockConnectAuthEmulator(...args),
  getApps: (...args: unknown[]) => mockGetApps(...args),
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  RecaptchaVerifier: jest.fn((...args: unknown[]) => mockCreateVerifier(...args)),
  signInWithPhoneNumber: (...args: unknown[]) => mockSignInWithPhoneNumber(...args),
  signInWithCredential: (...args: unknown[]) => mockSignInWithCredential(...args),
  getIdToken: (...args: unknown[]) => mockGetIdToken(...args),
  PhoneAuthProvider: { credential: (...args: unknown[]) => mockCredential(...args) },
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

type WebAuth = typeof import('../firebaseAuth.web');
interface FakeContainer {
  id: string;
  connected: boolean;
  remove: jest.Mock<void, []>;
}

const ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR',
] as const;
const originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const mockUser = { uid: 'web-user' };
const mockAuth = {
  currentUser: mockUser as typeof mockUser | null,
  authStateReady: jest.fn(),
  emulatorConfig: null as { host: string } | null,
};

describe('web Firebase auth adapter', () => {
  let service: WebAuth;
  let containers: FakeContainer[];
  let verifiers: { clear: jest.Mock<void, []> }[];

  function browser(hostname = 'gasp.example.test'): void {
    Object.defineProperty(globalThis, 'window', {
      configurable: true, writable: true, value: { location: { hostname } },
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      writable: true,
      value: {
        createElement: jest.fn(() => {
          const container: FakeContainer = {
            id: '', connected: false, remove: jest.fn(() => { container.connected = false; }),
          };
          containers.push(container);
          return container;
        }),
        body: { appendChild: jest.fn((container: FakeContainer) => { container.connected = true; }) },
      },
    });
  }

  function loadService(): WebAuth {
    let loaded: WebAuth | undefined;
    jest.isolateModules(() => { loaded = jest.requireActual<WebAuth>('../firebaseAuth.web'); });
    if (!loaded) throw new Error('Web auth adapter was not loaded');
    return loaded;
  }

  async function flush(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of ENV_KEYS) process.env[key] = `test-value-for-${key}`;
    containers = [];
    verifiers = [];
    browser();
    mockAuth.currentUser = mockUser;
    mockAuth.emulatorConfig = null;
    mockAuth.authStateReady.mockReset().mockResolvedValue(undefined);
    mockGetApps.mockReturnValue([]);
    mockInitializeApp.mockReturnValue({ name: '[DEFAULT]' });
    mockGetAuth.mockReturnValue(mockAuth);
    mockConnectAuthEmulator.mockReset();
    mockCreateVerifier.mockImplementation(() => {
      const verifier = { clear: jest.fn() };
      verifiers.push(verifier);
      return verifier;
    });
    mockSignInWithPhoneNumber.mockReset().mockResolvedValue({ verificationId: 'verification-1' });
    mockCredential.mockReturnValue({ providerId: 'phone', verificationId: 'verification-1' });
    mockSignInWithCredential.mockResolvedValue({ user: mockUser });
    mockGetIdToken.mockResolvedValue('web-id-token');
    mockSignOut.mockResolvedValue(undefined);
    service = loadService();
  });

  afterEach(() => service.clearPhoneVerifier());

  afterAll(() => {
    for (const [key, value] of originalEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    for (const [key, descriptor] of [['window', originalWindow], ['document', originalDocument]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });

  it('does not initialize Firebase or retain a session during SSR', async () => {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'document');
    await expect(service.getFirebaseIdToken()).resolves.toBeNull();
    await expect(service.signOutFirebase()).resolves.toBeUndefined();
    await expect(service.requestPhoneVerification('+15555550123')).rejects.toMatchObject({
      code: 'auth/operation-not-supported-in-this-environment',
    });
    await expect(service.confirmPhoneVerification('verification-1', '123456')).rejects.toMatchObject({
      code: 'auth/operation-not-supported-in-this-environment',
    });
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockGetAuth).not.toHaveBeenCalled();
    expect(mockSignInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it('reports missing config names without including any configured values', async () => {
    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = ' ';
    await expect(service.requestPhoneVerification('+15555550123')).rejects.toMatchObject({
      code: 'auth/web-config-missing',
      message: 'Firebase web configuration is incomplete: EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_APP_ID.',
    });
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockSignInWithPhoneNumber).not.toHaveBeenCalled();
    expect(containers).toHaveLength(0);
  });

  it.each(['localhost', 'dev.localhost', '127.0.0.1', '127.0.2.3', '::1', '[::1]', '0.0.0.0'])(
    'blocks phone verification on %s without an explicitly connected emulator',
    async (host) => {
      browser(host);
      await expect(service.requestPhoneVerification('+15555550123')).rejects.toMatchObject({
        code: 'auth/web-localhost-not-supported',
      });
      expect(mockSignInWithPhoneNumber).not.toHaveBeenCalled();
      expect(mockCreateVerifier).not.toHaveBeenCalled();
      expect(mockInitializeApp).not.toHaveBeenCalled();
      expect(mockGetAuth).not.toHaveBeenCalled();
    },
  );

  it('allows a mock explicitly connected emulator without enabling verification bypasses', async () => {
    browser('localhost');
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR = 'true';
    mockConnectAuthEmulator.mockImplementation(() => {
      mockAuth.emulatorConfig = { host: '127.0.0.1' };
    });
    await service.getFirebaseIdToken();
    await expect(service.requestPhoneVerification('+15555550123')).resolves.toEqual({
      verificationId: 'verification-1',
    });
    expect(mockConnectAuthEmulator).toHaveBeenCalledWith(mockAuth, 'http://127.0.0.1:9099');
    expect(mockSignInWithPhoneNumber).toHaveBeenCalledTimes(1);
    expect(mockAuth).not.toHaveProperty('settings');
  });

  it('uses one initialized Auth instance and cleans a successful verifier before resend', async () => {
    await service.requestPhoneVerification('+15555550123');
    await service.requestPhoneVerification('+15555550123', true);
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockGetAuth).toHaveBeenCalledTimes(1);
    expect(mockAuth.authStateReady).toHaveBeenCalledTimes(2);
    expect(mockCreateVerifier).toHaveBeenCalledTimes(2);
    expect(mockCreateVerifier).toHaveBeenCalledWith(mockAuth, containers[0], { size: 'invisible' });
    expect(mockSignInWithPhoneNumber).toHaveBeenNthCalledWith(1, mockAuth, '+15555550123', verifiers[0]);
    expect(verifiers.every((verifier) => verifier.clear.mock.calls.length === 1)).toBe(true);
    expect(containers.every((container) => !container.connected)).toBe(true);
  });

  it('cleans a failed challenge and creates a fresh verifier on retry', async () => {
    const error = Object.assign(new Error('Invalid verifier'), { code: 'auth/captcha-check-failed' });
    mockSignInWithPhoneNumber.mockRejectedValueOnce(error);
    await expect(service.requestPhoneVerification('+15555550123')).rejects.toBe(error);
    expect(verifiers[0].clear).toHaveBeenCalledTimes(1);
    expect(containers[0].connected).toBe(false);

    await expect(service.requestPhoneVerification('+15555550123', true)).resolves.toEqual({
      verificationId: 'verification-1',
    });
    expect(verifiers).toHaveLength(2);
    expect(verifiers[1]).not.toBe(verifiers[0]);
    expect(containers.every((container) => !container.connected)).toBe(true);
  });

  it('removes the container if constructing the verifier fails', async () => {
    mockCreateVerifier.mockImplementationOnce(() => { throw new Error('Failed to create captcha'); });
    await expect(service.requestPhoneVerification('+15555550123')).rejects.toThrow('Failed to create captcha');
    expect(containers[0].connected).toBe(false);
    expect(mockSignInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it('shares concurrent clicks and cancels a pending challenge when the screen unmounts', async () => {
    mockSignInWithPhoneNumber.mockReturnValueOnce(new Promise(() => {}));
    const first = service.requestPhoneVerification('+15555550123');
    const second = service.requestPhoneVerification('+15555550123');
    expect(second).toBe(first);
    await flush();
    expect(mockSignInWithPhoneNumber).toHaveBeenCalledTimes(1);

    service.clearPhoneVerifier();
    service.clearPhoneVerifier();
    await expect(first).rejects.toMatchObject({ code: 'auth/web-verification-cancelled' });
    expect(verifiers[0].clear).toHaveBeenCalledTimes(1);
    expect(containers[0].connected).toBe(false);
    await expect(service.requestPhoneVerification('+15555550123')).resolves.toEqual({
      verificationId: 'verification-1',
    });
  });

  it('waits for restored session state before reading the current user', async () => {
    mockAuth.currentUser = null;
    let finishRestore: () => void = () => {};
    mockAuth.authStateReady.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishRestore = () => { mockAuth.currentUser = mockUser; resolve(); };
    }));
    const reading = service.getFirebaseIdToken(true);
    expect(mockGetIdToken).not.toHaveBeenCalled();
    finishRestore();
    await expect(reading).resolves.toBe('web-id-token');
    expect(mockGetIdToken).toHaveBeenCalledWith(mockUser, true);
  });

  it('does not start an SMS request when cleanup follows auth restoration in the same turn', async () => {
    let finishRestore: () => void = () => {};
    mockAuth.authStateReady.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishRestore = resolve;
    }));
    const sending = service.requestPhoneVerification('+15555550123');
    await flush();
    finishRestore();
    service.clearPhoneVerifier();
    await expect(sending).rejects.toMatchObject({ code: 'auth/web-verification-cancelled' });
    expect(mockCreateVerifier).not.toHaveBeenCalled();
    expect(mockSignInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it('confirms the provided verification ID and returns the SDK user token', async () => {
    await expect(service.confirmPhoneVerification('verification-1', '123456')).resolves.toBe('web-id-token');
    expect(mockCredential).toHaveBeenCalledWith('verification-1', '123456');
    expect(mockSignInWithCredential).toHaveBeenCalledWith(mockAuth, {
      providerId: 'phone', verificationId: 'verification-1',
    });
    expect(mockGetIdToken).toHaveBeenCalledWith(mockUser, true);
  });

  it('reuses an existing default app and signs out only when it has a user', async () => {
    const existing = { name: '[DEFAULT]' };
    mockGetApps.mockReturnValue([existing]);
    await expect(service.getFirebaseIdToken()).resolves.toBe('web-id-token');
    await service.signOutFirebase();
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockGetAuth).toHaveBeenCalledWith(existing);
    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    mockAuth.currentUser = null;
    await expect(service.getFirebaseIdToken()).resolves.toBeNull();
    await service.signOutFirebase();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
