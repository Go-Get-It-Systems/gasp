import axios from 'axios';
import { getAuthToken, setAuthToken, removeAuthToken } from '@/utils/storage';

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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gasp-backend-production.up.railway.app';

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
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  if (__DEV__) {
    console.tronLog?.debug(`API ▶ ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
    });
  }
  return config;
});

// ── Response interceptor: handle 401 + refresh ─────────────────────
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.tronLog?.log(`API ◀ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    const original = error.config;

    // If 401 and not already retried, try to refresh
    // Skip refresh for auth endpoints to avoid infinite loops
    if (__DEV__) {
      console.tronLog?.error(`API ✖ ${error.response?.status ?? 'ERR'} ${original.method?.toUpperCase()} ${original.url}`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    const isAuthEndpoint = original.url?.includes('/auth/');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      try {
        // Serialize concurrent refresh attempts into a single request
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const currentToken = await getAuthToken();
            if (!currentToken) throw new Error('No token');

            const { data } = await axios.post(
              `${API_URL}/api/v1/auth/refresh`,
              {},
              { headers: { Authorization: `Bearer ${currentToken}` } },
            );

            const newToken = data.token as string;
            await setAuthToken(newToken);
            _authCallbacks?.onTokenRefreshed(newToken);
            return newToken;
          })();
        }

        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // Refresh failed → logout
        await removeAuthToken();
        _authCallbacks?.onLogout();
        return Promise.reject(error);
      } finally {
        refreshPromise = null;
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
