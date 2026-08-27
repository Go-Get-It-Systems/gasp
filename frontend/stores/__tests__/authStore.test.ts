/**
 * authStore Tests
 *
 * Tests for login, logout, initializeAuth, and token expiry.
 * Mocks all external services to isolate store logic.
 */

// ── Mocks must be declared before imports ─────────────────────────────────────

jest.mock('@/services/api/auth', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
}));

jest.mock('@/services/api/users', () => ({
  getMe: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  setApiToken: jest.fn(),
  registerAuthCallbacks: jest.fn(),
}));

jest.mock('@/services/socket', () => ({
  connectSocket: jest.fn(),
  disconnectSocket: jest.fn(),
  getSocket: jest.fn(() => null),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useAuthStore } from '@/stores/authStore';
import * as authApi from '@/services/api/auth';
import * as usersApi from '@/services/api/users';
import { setApiToken, registerAuthCallbacks } from '@/services/api';
import { connectSocket, disconnectSocket } from '@/services/socket';
import * as SecureStore from 'expo-secure-store';

declare global {
  var mockFirebaseCurrentUser: { uid: string } | null;
  var mockFirebaseSignOut: jest.Mock<Promise<void>, []>;
}

// ── Typed mock helpers ────────────────────────────────────────────────────────

const mockLogin = authApi.login as jest.Mock;
const mockAuthLogout = authApi.logout as jest.Mock;
const mockGetMe = usersApi.getMe as jest.Mock;
const mockSetApiToken = setApiToken as jest.Mock;
const mockRegisterAuthCallbacks = registerAuthCallbacks as jest.Mock;
const mockConnectSocket = connectSocket as jest.Mock;
const mockDisconnectSocket = disconnectSocket as jest.Mock;
const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

// ── Capture module-level registerAuthCallbacks invocation ─────────────────────
// authStore.ts calls registerAuthCallbacks() at module load time.
// We capture the callbacks here (before beforeEach clears mocks) so tests
// that verify callback behavior can access them reliably.
let capturedAuthCallbacks: {
  onTokenRefreshed: (token: string) => void;
  onLogout: () => void;
} | null = null;

// ── Token fixtures ────────────────────────────────────────────────────────────

/** Valid JWT — exp: 2030-01-01 (Unix 1893456000) */
const VALID_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEiLCJleHAiOjE4OTM0NTYwMDB9.fake-sig';

/** Expired JWT — exp: 2001-09-09 (Unix 1000000000) */
const EXPIRED_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEiLCJleHAiOjEwMDAwMDAwMDB9.fake-sig';

// ── Mock user factory ─────────────────────────────────────────────────────────

function getMockUser(overrides = {}) {
  return {
    id: 'user-1',
    displayName: 'Test User',
    username: 'testuser',
    avatarUrl: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('authStore', () => {
  beforeAll(() => {
    // Capture the callbacks registered at module load time.
    // Must run before beforeEach clears mock call history.
    if (mockRegisterAuthCallbacks.mock.calls.length > 0) {
      capturedAuthCallbacks = mockRegisterAuthCallbacks.mock.calls[0][0];
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Firebase Auth mock state — default: user is logged in
    global.mockFirebaseCurrentUser = { uid: 'firebase-user-1' };
    global.mockFirebaseSignOut.mockReset();
    global.mockFirebaseSignOut.mockResolvedValue(undefined);

    // Reset store to initial state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
    });

    // Default mock implementations
    mockAuthLogout.mockResolvedValue(undefined);
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
  });

  // ── registerAuthCallbacks ────────────────────────────────────────────────────

  describe('module initialization', () => {
    it('calls registerAuthCallbacks on import with the correct callback shape', () => {
      // The module-level registerAuthCallbacks() call fires when the store is
      // first imported. The call history is captured in beforeAll (before
      // beforeEach clears mocks), so we verify via capturedAuthCallbacks.
      expect(capturedAuthCallbacks).not.toBeNull();
      expect(typeof capturedAuthCallbacks?.onTokenRefreshed).toBe('function');
      expect(typeof capturedAuthCallbacks?.onLogout).toBe('function');
    });
  });

  // ── login ────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('sets user, token, and isAuthenticated on success', async () => {
      const mockUser = getMockUser();
      mockLogin.mockResolvedValueOnce({ user: mockUser, token: VALID_TOKEN });

      await useAuthStore.getState().login('firebase-token-abc');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(VALID_TOKEN);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitialized).toBe(true);
    });

    it('calls setApiToken with the token', async () => {
      const mockUser = getMockUser();
      mockLogin.mockResolvedValueOnce({ user: mockUser, token: VALID_TOKEN });

      await useAuthStore.getState().login('firebase-token-abc');

      expect(mockSetApiToken).toHaveBeenCalledWith(VALID_TOKEN);
    });

    it('calls connectSocket with the token', async () => {
      const mockUser = getMockUser();
      mockLogin.mockResolvedValueOnce({ user: mockUser, token: VALID_TOKEN });

      await useAuthStore.getState().login('firebase-token-abc');

      expect(mockConnectSocket).toHaveBeenCalledWith(VALID_TOKEN);
    });

    it('sets isLoading true during login and false after', async () => {
      const mockUser = getMockUser();
      let loadingDuringLogin = false;

      mockLogin.mockImplementationOnce(async () => {
        loadingDuringLogin = useAuthStore.getState().isLoading;
        return { user: mockUser, token: VALID_TOKEN };
      });

      await useAuthStore.getState().login('firebase-token-abc');

      expect(loadingDuringLogin).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets isLoading false even when login fails', async () => {
      mockLogin.mockRejectedValueOnce(new Error('User not found'));

      await expect(
        useAuthStore.getState().login('firebase-token-abc'),
      ).rejects.toThrow('User not found');

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('throws on API failure without changing auth state', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        useAuthStore.getState().login('firebase-token-abc'),
      ).rejects.toThrow('Network error');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('returns the user object on success', async () => {
      const mockUser = getMockUser({ id: 'user-42', displayName: 'Alice' });
      mockLogin.mockResolvedValueOnce({ user: mockUser, token: VALID_TOKEN });

      const returnedUser = await useAuthStore.getState().login('firebase-token-abc');

      expect(returnedUser).toEqual(mockUser);
    });

    it('persists token to secure store', async () => {
      const mockUser = getMockUser();
      mockLogin.mockResolvedValueOnce({ user: mockUser, token: VALID_TOKEN });

      await useAuthStore.getState().login('firebase-token-abc');

      expect(mockSetItemAsync).toHaveBeenCalledWith(
        'gasp_auth_token',
        VALID_TOKEN,
      );
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────────

  describe('logout', () => {
    beforeEach(() => {
      // Put store in authenticated state
      useAuthStore.setState({
        user: getMockUser(),
        token: VALID_TOKEN,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
    });

    it('clears user, token, and isAuthenticated', async () => {
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('calls disconnectSocket', async () => {
      await useAuthStore.getState().logout();

      expect(mockDisconnectSocket).toHaveBeenCalledTimes(1);
    });

    it('calls setApiToken(null)', async () => {
      await useAuthStore.getState().logout();

      expect(mockSetApiToken).toHaveBeenCalledWith(null);
    });

    it('continues with local logout even if API logout fails', async () => {
      mockAuthLogout.mockRejectedValueOnce(new Error('Network error'));

      await useAuthStore.getState().logout();

      // Should still clear local state
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('continues even if disconnectSocket throws', async () => {
      mockDisconnectSocket.mockImplementationOnce(() => {
        throw new Error('Socket error');
      });

      // Should not throw
      await expect(useAuthStore.getState().logout()).resolves.not.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('sets isInitialized to true after logout', async () => {
      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it('removes token from secure store', async () => {
      await useAuthStore.getState().logout();

      expect(mockDeleteItemAsync).toHaveBeenCalledWith('gasp_auth_token');
    });

    // ── Firebase Auth guard — Bug Condition (REACT-NATIVE-6) ──────────────────
    // Tarefa 1: teste exploratório — DEVE FALHAR antes do fix
    // Confirma que logout() com currentUser === null lança auth/no-current-user
    it('does not throw and does not call firebaseSignOut when currentUser is null', async () => {
      // Bug condition: Firebase has no authenticated user
      global.mockFirebaseCurrentUser = null;

      await expect(useAuthStore.getState().logout()).resolves.not.toThrow();
      expect(global.mockFirebaseSignOut).not.toHaveBeenCalled();
    });

    // Tarefa 2: teste de preservation — deve PASSAR antes e depois do fix
    // Confirma que logout() com currentUser presente chama firebaseSignOut normalmente
    it('calls firebaseSignOut exactly once when currentUser is present', async () => {
      // Preservation: default state — user is logged in (set in beforeEach)
      global.mockFirebaseCurrentUser = { uid: 'firebase-user-1' };

      await useAuthStore.getState().logout();

      expect(global.mockFirebaseSignOut).toHaveBeenCalledTimes(1);
    });
  });

  // ── initializeAuth ────────────────────────────────────────────────────────────

  describe('initializeAuth', () => {
    it('returns false and sets isInitialized when no saved token', async () => {
      mockGetItemAsync.mockResolvedValueOnce(null);

      const result = await useAuthStore.getState().initializeAuth();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it('clears expired token and returns false', async () => {
      mockGetItemAsync.mockResolvedValueOnce(EXPIRED_TOKEN);

      const result = await useAuthStore.getState().initializeAuth();

      expect(result).toBe(false);
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('gasp_auth_token');
      expect(useAuthStore.getState().isInitialized).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('clears invalid (unparseable) token and returns false', async () => {
      mockGetItemAsync.mockResolvedValueOnce('not-a-jwt-at-all');

      const result = await useAuthStore.getState().initializeAuth();

      expect(result).toBe(false);
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('gasp_auth_token');
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it('restores a valid session successfully', async () => {
      const mockUser = getMockUser();
      mockGetItemAsync.mockResolvedValueOnce(VALID_TOKEN);
      mockGetMe.mockResolvedValueOnce(mockUser);

      const result = await useAuthStore.getState().initializeAuth();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(VALID_TOKEN);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitialized).toBe(true);
    });

    it('calls setApiToken with the saved token before /users/me', async () => {
      const mockUser = getMockUser();
      mockGetItemAsync.mockResolvedValueOnce(VALID_TOKEN);
      mockGetMe.mockResolvedValueOnce(mockUser);

      await useAuthStore.getState().initializeAuth();

      expect(mockSetApiToken).toHaveBeenCalledWith(VALID_TOKEN);
    });

    it('calls connectSocket with the saved token on valid session', async () => {
      const mockUser = getMockUser();
      mockGetItemAsync.mockResolvedValueOnce(VALID_TOKEN);
      mockGetMe.mockResolvedValueOnce(mockUser);

      await useAuthStore.getState().initializeAuth();

      expect(mockConnectSocket).toHaveBeenCalledWith(VALID_TOKEN);
    });

    it('clears session and returns false when /users/me fails', async () => {
      mockGetItemAsync.mockResolvedValueOnce(VALID_TOKEN);
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await useAuthStore.getState().initializeAuth();

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitialized).toBe(true);
    });

    it('removes token from secure store when /users/me fails', async () => {
      mockGetItemAsync.mockResolvedValueOnce(VALID_TOKEN);
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'));

      await useAuthStore.getState().initializeAuth();

      expect(mockDeleteItemAsync).toHaveBeenCalledWith('gasp_auth_token');
    });

    it('sets isLoading true during init and false after', async () => {
      const mockUser = getMockUser();
      let loadingDuringInit = false;

      mockGetItemAsync.mockResolvedValueOnce(VALID_TOKEN);
      mockGetMe.mockImplementationOnce(async () => {
        loadingDuringInit = useAuthStore.getState().isLoading;
        return mockUser;
      });

      await useAuthStore.getState().initializeAuth();

      expect(loadingDuringInit).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets isLoading false even when init fails', async () => {
      mockGetItemAsync.mockRejectedValueOnce(new Error('SecureStore error'));

      await expect(
        useAuthStore.getState().initializeAuth(),
      ).rejects.toThrow();

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ── token expiry edge cases ───────────────────────────────────────────────────

  describe('token expiry', () => {
    it('expired token: does not call setApiToken', async () => {
      mockGetItemAsync.mockResolvedValueOnce(EXPIRED_TOKEN);

      await useAuthStore.getState().initializeAuth();

      expect(mockSetApiToken).not.toHaveBeenCalled();
    });

    it('expired token: does not call connectSocket', async () => {
      mockGetItemAsync.mockResolvedValueOnce(EXPIRED_TOKEN);

      await useAuthStore.getState().initializeAuth();

      expect(mockConnectSocket).not.toHaveBeenCalled();
    });

    it('expired token: does not call /users/me', async () => {
      mockGetItemAsync.mockResolvedValueOnce(EXPIRED_TOKEN);

      await useAuthStore.getState().initializeAuth();

      expect(mockGetMe).not.toHaveBeenCalled();
    });
  });

  // ── registerAuthCallbacks integration ────────────────────────────────────────

  describe('registerAuthCallbacks callbacks', () => {
    it('onTokenRefreshed updates token and isAuthenticated in store', () => {
      // capturedAuthCallbacks was saved in beforeAll before mocks were cleared
      expect(capturedAuthCallbacks).not.toBeNull();

      capturedAuthCallbacks!.onTokenRefreshed(VALID_TOKEN);

      const state = useAuthStore.getState();
      expect(state.token).toBe(VALID_TOKEN);
      expect(state.isAuthenticated).toBe(true);
    });

    it('onTokenRefreshed calls setApiToken with new token', () => {
      expect(capturedAuthCallbacks).not.toBeNull();

      capturedAuthCallbacks!.onTokenRefreshed(VALID_TOKEN);

      expect(mockSetApiToken).toHaveBeenCalledWith(VALID_TOKEN);
    });
  });
});
