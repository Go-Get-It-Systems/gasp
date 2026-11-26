import axios from 'axios';
import { getAuthToken, setAuthToken, removeAuthToken } from '@/utils/storage';
import { assertCurrentSession, getSessionGeneration, StaleSessionError } from './session';

declare module 'axios' {
  interface InternalAxiosRequestConfig { _sessionGeneration?: number; }
}

// ── In-memory token + callbacks (avoids circular dep with authStore) ──
let _token: string | null = null;

/** Called by authStore whenever the JWT changes */
export function setApiToken(token: string | null) {
  _token = token;
}

interface AuthCallbacks {
  onTokenRefreshed: (token: string) => void;
  onLogout: () => void;
}
let _authCallbacks: AuthCallbacks | null = null;

export function registerAuthCallbacks(callbacks: AuthCallbacks) {
  _authCallbacks = callbacks;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

function safeLogData(url: string | undefined, data: unknown): unknown {
  return url?.includes('/auth/') || url?.includes('/uploads/access') ? '[redacted sensitive payload]' : data;
}

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// ── Request interceptor: inject JWT ────────────────────────────────
api.interceptors.request.use((config) => {
  if (config._sessionGeneration !== undefined) assertCurrentSession(config._sessionGeneration);
  config._sessionGeneration = getSessionGeneration();
  if (_token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  if (__DEV__) {
    console.tronLog?.debug(`API ▶ ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: safeLogData(config.url, config.data),
    });
  }
  return config;
});

// ── Response interceptor: handle 401 + refresh ─────────────────────
let refreshPromise: Promise<string> | null = null;
let refreshGeneration = -1;

api.interceptors.response.use(
  (response) => {
    if (response.config._sessionGeneration !== undefined) assertCurrentSession(response.config._sessionGeneration);
    if (__DEV__) {
      console.tronLog?.log(`API ◀ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        data: safeLogData(response.config.url, response.data),
      });
    }
    return response;
  },
  async (error) => {
    if (error instanceof StaleSessionError) return Promise.reject(error);
    const original = error.config;
    if (!original) return Promise.reject(error);
    if (original._sessionGeneration !== undefined && original._sessionGeneration !== getSessionGeneration()) {
      return Promise.reject(new StaleSessionError());
    }

    // If 401 and not already retried, try to refresh
    // Skip refresh for auth endpoints to avoid infinite loops
    if (__DEV__) {
      console.tronLog?.error(`API ✖ ${error.response?.status ?? 'ERR'} ${original.method?.toUpperCase()} ${original.url}`, {
        status: error.response?.status,
        data: safeLogData(original.url, error.response?.data),
        message: error.message,
      });
    }

    const isAuthEndpoint = original.url?.includes('/auth/');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      const requestGeneration = original._sessionGeneration ?? getSessionGeneration();

      try {
        // Serialize concurrent refresh attempts into a single request
        if (!refreshPromise || refreshGeneration !== requestGeneration) {
          refreshGeneration = requestGeneration;
          const generation = getSessionGeneration();
          refreshPromise = (async () => {
            const currentToken = await getAuthToken();
            assertCurrentSession(generation);
            if (!currentToken) throw new Error('No token');

            const { data } = await axios.post(
              `${API_URL}/api/v1/auth/refresh`,
              {},
              { headers: { Authorization: `Bearer ${currentToken}` } },
            );

            const newToken = data.token as string;
            assertCurrentSession(generation);
            await setAuthToken(newToken);
            assertCurrentSession(generation);
            _authCallbacks?.onTokenRefreshed(newToken);
            return newToken;
          })();
        }

        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        if (original._sessionGeneration !== undefined && original._sessionGeneration !== getSessionGeneration()) {
          return Promise.reject(new StaleSessionError());
        }
        // Refresh failed → logout
        await removeAuthToken();
        _authCallbacks?.onLogout();
        return Promise.reject(error);
      } finally {
        if (refreshGeneration === requestGeneration) refreshPromise = null;
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed response helpers ─────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  details?: unknown[];
}

/** Extract error message from API response */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
