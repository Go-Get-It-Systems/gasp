import { getRefreshedFirebaseToken, signOutFirebase } from '@/lib/firebaseAuth';
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
import * as Sentry from '@sentry/react-native';
import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: User) => void;
  setToken: (token: string) => void;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setUser: (user) =>
    set({ user, isAuthenticated: true }),

  setToken: async (token) => {
    await setAuthToken(token);
    setApiToken(token);
    set({ token, isAuthenticated: true });
  },

  logout: async () => {
    if (__DEV__) {
      console.tronLog?.warn('authStore | logout');
    }
    // Revoke token on backend (best effort)
    try {
      await authApi.logout();
    } catch {
      // Continue with local logout even if API fails
    }

    try {
      disconnectSocket();
    } catch (e) {
      Sentry.captureException(e);
    }

    try {
      await signOutFirebase();
    } catch (e) {
      Sentry.captureException(e);
    }

    try {
      await removeAuthToken();
      await removeUserData();
    } catch (e) {
      Sentry.captureException(e);
    }

    setApiToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  login: async (firebaseToken) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authApi.login(firebaseToken);
      await setAuthToken(token);
      setApiToken(token);
      await setUserData(JSON.stringify(user));
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
    set({ isLoading: true });
    try {
      const { user, token } = await authApi.register(data);
      await setAuthToken(token);
      setApiToken(token);
      await setUserData(JSON.stringify(user));
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
    set({ isLoading: true });
    try {
      const savedToken = await getAuthToken();
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
        await setUserData(JSON.stringify(user));
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
        // B5: before forcing full re-auth, try to silently refresh using the
        // existing Firebase native session (persistent on device). This covers
        // the case where the backend JWT expired but the user's Firebase auth
        // session is still valid — avoids prompting for phone number again.
        try {
          const freshFirebaseToken = await getRefreshedFirebaseToken();
          if (freshFirebaseToken) {
            const { user: refreshedUser, token: newToken } = await authApi.login(freshFirebaseToken);
            await setAuthToken(newToken);
            setApiToken(newToken);
            await setUserData(JSON.stringify(refreshedUser));
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
        await removeAuthToken();
        await removeUserData();
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });
        return false;
      }
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
