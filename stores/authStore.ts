import { registerAuthCallbacks, setApiToken } from '@/services/api';
import * as authApi from '@/services/api/auth';
import type { User } from '@/services/api/schemas/user.schema';
import * as usersApi from '@/services/api/users';
import { connectSocket, disconnectSocket } from '@/services/socket';
import {
    getAuthToken,
    removeAuthToken,
    removeUserData,
    setAuthToken,
    setUserData,
} from '@/utils/storage';
import { getFirebaseIdToken, signOutFirebase } from '@/services/firebaseAuth';
import * as Sentry from '@sentry/react-native';
import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import { advanceSession, assertCurrentSession, getSessionGeneration, setSessionActor } from '@/services/session';
import { clearSessionData } from '@/services/sessionCleanup';

let logoutInProgress: Promise<void> | null = null;

function isUnexpiredApiToken(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = jwtDecode<{ exp?: number }>(token);
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: User) => void;
  setToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;

  /** Login with Firebase token. Throws if user not found (needs register). */
  login: (firebaseToken: string) => Promise<User>;

  /** Register new user with Firebase token + profile data. */
  register: (data: {
    firebaseToken: string;
    displayName: string;
    username: string;
    accountType?: 'personal' | 'business';
  }) => Promise<User>;

  /** Restore session on app launch. Returns true if session is valid. */
  initializeAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setUser: (user) =>
    set({ user, isAuthenticated: true }),

  setToken: async (token) => {
    const generation = getSessionGeneration();
    await setAuthToken(token);
    assertCurrentSession(generation);
    setApiToken(token);
    set({ token, isAuthenticated: true });
  },

  logout: async () => {
    if (logoutInProgress) return logoutInProgress;
    const token = get().token;
    advanceSession();
    setApiToken(null);
    set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
    try { disconnectSocket(); } catch (e) { Sentry.captureException(e); }
    const cleanup = clearSessionData();
    const eraseCredentials = (async () => {
      try { await removeAuthToken(); } catch (e) { Sentry.captureException(e); }
      try { await removeUserData(); } catch (e) { Sentry.captureException(e); }
    })();
    logoutInProgress = (async () => {
    if (__DEV__) {
      console.tronLog?.warn('authStore | logout');
    }
    // Revoke a still-valid backend JWT. Expired, missing, or malformed tokens
    // cannot pass the protected logout route, so clear those sessions locally.
    if (isUnexpiredApiToken(token)) {
      try {
        await authApi.logout(token!);
      } catch {
        // Continue with local logout even if API revocation fails.
      }
    }

    try {
      await signOutFirebase();
    } catch (e) {
      Sentry.captureException(e);
    }

    await eraseCredentials;

    setApiToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: true,
    });
    await cleanup;
    })();
    try { await logoutInProgress; } finally { logoutInProgress = null; }
  },

  setLoading: (isLoading) => set({ isLoading }),

  login: async (firebaseToken) => {
    await logoutInProgress;
    const generation = advanceSession();
    setApiToken(null);
    set({ user: null, token: null, isAuthenticated: false });
    await clearSessionData();
    set({ isLoading: true });
    try {
      const { user, token } = await authApi.login(firebaseToken);
      assertCurrentSession(generation);
      await setAuthToken(token);
      assertCurrentSession(generation);
      setApiToken(token);
      await setUserData(JSON.stringify(user));
      assertCurrentSession(generation);
      setSessionActor(user.id);
      connectSocket(token);
      if (__DEV__) {
        console.tronLog?.log('authStore | login success', { userId: user.id, username: user.username });
      }
      import('@/services/pushService').then(({ registerIfNeeded }) => registerIfNeeded().catch(() => {}));
      set({
        user,
        token,
        isAuthenticated: true,
        isInitialized: true,
      });
      return user;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    await logoutInProgress;
    const generation = advanceSession();
    setApiToken(null);
    set({ user: null, token: null, isAuthenticated: false });
    await clearSessionData();
    set({ isLoading: true });
    try {
      const { user, token } = await authApi.register(data);
      assertCurrentSession(generation);
      await setAuthToken(token);
      assertCurrentSession(generation);
      setApiToken(token);
      await setUserData(JSON.stringify(user));
      assertCurrentSession(generation);
      setSessionActor(user.id);
      connectSocket(token);
      if (__DEV__) {
        console.tronLog?.log('authStore | register success', { userId: user.id, username: user.username });
      }
      import('@/services/pushService').then(({ registerIfNeeded }) => registerIfNeeded().catch(() => {}));
      set({
        user,
        token,
        isAuthenticated: true,
        isInitialized: true,
      });
      return user;
    } finally {
      set({ isLoading: false });
    }
  },

  initializeAuth: async () => {
    await logoutInProgress;
    advanceSession();
    const generation = getSessionGeneration();
    await clearSessionData();
    set({ isLoading: true });
    try {
      const savedToken = await getAuthToken();
      assertCurrentSession(generation);
      if (!savedToken) {
        set({ isInitialized: true });
        return false;
      }

      // Check if token is expired before using it
      try {
        const decoded = jwtDecode<{ exp?: number }>(savedToken);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          // Token expired — clear and go to login
          await removeAuthToken();
          set({ isInitialized: true });
          return false;
        }
      } catch {
        // Invalid token — clear and go to login
        await removeAuthToken();
        set({ isInitialized: true });
        return false;
      }

      // Set token so API interceptor can use it
      setApiToken(savedToken);
      set({ token: savedToken });

      try {
        const user = await usersApi.getMe();
        assertCurrentSession(generation);
        await setUserData(JSON.stringify(user));
        assertCurrentSession(generation);
        setSessionActor(user.id);
        connectSocket(savedToken);
        if (__DEV__) {
          console.tronLog?.log('authStore | session restored', { userId: user.id, username: user.username });
        }
        import('@/services/pushService').then(({ registerIfNeeded }) => registerIfNeeded().catch(() => {}));
        set({
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
        return true;
      } catch (initError) {
        if (generation !== getSessionGeneration()) return false;
        // B5: before forcing full re-auth, try to silently refresh using the
        // existing Firebase native session (persistent on device). This covers
        // the case where the backend JWT expired but the user's Firebase auth
        // session is still valid — avoids prompting for phone number again.
        try {
          const freshFirebaseToken = await getFirebaseIdToken(/* forceRefresh */ true);
          assertCurrentSession(generation);
          if (freshFirebaseToken) {
            const { user: refreshedUser, token: newToken } = await authApi.login(freshFirebaseToken);
            assertCurrentSession(generation);
            await setAuthToken(newToken);
            assertCurrentSession(generation);
            setApiToken(newToken);
            await setUserData(JSON.stringify(refreshedUser));
            assertCurrentSession(generation);
            setSessionActor(refreshedUser.id);
            connectSocket(newToken);
            if (__DEV__) {
              console.tronLog?.log('authStore | silent refresh success', { userId: refreshedUser.id });
            }
            import('@/services/pushService').then(({ registerIfNeeded }) => registerIfNeeded().catch(() => {}));
            set({
              user: refreshedUser,
              token: newToken,
              isAuthenticated: true,
              isInitialized: true,
            });
            return true;
          }
        } catch (silentRefreshError) {
          if (generation !== getSessionGeneration()) return false;
          Sentry.captureException(silentRefreshError, {
            extra: { context: 'authStore.initializeAuth.silentRefresh' },
          });
        }

        // Silent refresh failed → full re-auth required, clear session
        Sentry.captureException(initError, {
          extra: { context: 'authStore.initializeAuth.tokenValidation' },
        });
        try {
          await signOutFirebase();
        } catch (signOutError) {
          Sentry.captureException(signOutError, {
            extra: { context: 'authStore.initializeAuth.firebaseSignOut' },
          });
        }
        assertCurrentSession(generation);
        await removeAuthToken();
        assertCurrentSession(generation);
        await removeUserData();
        assertCurrentSession(generation);
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });
        return false;
      }
    } catch (error) {
      if (generation !== getSessionGeneration()) return false;
      Sentry.captureException(error, {
        extra: { context: 'authStore.initializeAuth.storage' },
      });
      // A storage failure must not leave startup waiting forever. Keep the
      // persisted session intact so a later launch can try reading it again.
      setApiToken(null);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isInitialized: true,
      });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Wire up API interceptor callbacks (breaks circular dep: authStore → api/auth → api)
registerAuthCallbacks({
  onTokenRefreshed: (token) => {
    setApiToken(token);
    useAuthStore.setState({ token, isAuthenticated: true });
  },
  onLogout: () => void useAuthStore.getState().logout(),
});
