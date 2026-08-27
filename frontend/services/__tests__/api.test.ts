/**
 * API Service Tests
 *
 * Tests for getApiErrorMessage and setApiToken from services/api.ts.
 * axios.isAxiosError is mocked to isolate error extraction logic.
 */

// ── Mocks must be declared before imports ─────────────────────────────────────

jest.mock('axios', () => {
  // Fully mock axios to avoid loading its fetch adapter which triggers
  // a ReadableStream.cancel() unhandled rejection with expo's streams polyfill
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: { headers: { common: {}, get: {}, post: {}, put: {}, delete: {} } },
  };
  return {
    default: Object.assign(jest.fn(() => mockInstance), {
      create: jest.fn(() => mockInstance),
      isAxiosError: jest.fn(),
    }),
    create: jest.fn(() => mockInstance),
    isAxiosError: jest.fn(),
  };
});

// Mock storage utils to avoid expo-secure-store import issues in api.ts
jest.mock('@/utils/storage', () => ({
  getAuthToken: jest.fn(() => Promise.resolve(null)),
  setAuthToken: jest.fn(() => Promise.resolve()),
  removeAuthToken: jest.fn(() => Promise.resolve()),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import axios from 'axios';
import { getApiErrorMessage, setApiToken, registerAuthCallbacks, api } from '@/services/api';

// ── Typed mock helpers ────────────────────────────────────────────────────────

const mockIsAxiosError = (axios.isAxiosError as unknown) as jest.Mock;

// ── Helper: build a fake Axios error ─────────────────────────────────────────

function makeAxiosError(
  message: string,
  responseData?: unknown,
): { message: string; response?: { data: unknown } } {
  return {
    message,
    ...(responseData !== undefined ? { response: { data: responseData } } : {}),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getApiErrorMessage', () => {
  beforeEach(() => {
    mockIsAxiosError.mockReset();
  });

  it('extracts message from Axios error response data', () => {
    const error = makeAxiosError('Request failed with status code 400', {
      error: 'bad_request',
      message: 'Invalid email',
    });
    mockIsAxiosError.mockReturnValue(true);

    const result = getApiErrorMessage(error);

    expect(result).toBe('Invalid email');
  });

  it('falls back to error.message for Axios errors without response data', () => {
    const error = makeAxiosError('Network Error');
    mockIsAxiosError.mockReturnValue(true);

    const result = getApiErrorMessage(error);

    expect(result).toBe('Network Error');
  });

  it('falls back to error.message for Axios errors with response data missing message', () => {
    const error = makeAxiosError('Request failed', { error: 'server_error' });
    mockIsAxiosError.mockReturnValue(true);

    const result = getApiErrorMessage(error);

    expect(result).toBe('Request failed');
  });

  it('handles plain Error objects', () => {
    const error = new Error('Something went wrong');
    mockIsAxiosError.mockReturnValue(false);

    const result = getApiErrorMessage(error);

    expect(result).toBe('Something went wrong');
  });

  it('returns fallback message for unknown string errors', () => {
    mockIsAxiosError.mockReturnValue(false);

    const result = getApiErrorMessage('some string error');

    expect(result).toBe('An unexpected error occurred');
  });

  it('returns fallback message for null', () => {
    mockIsAxiosError.mockReturnValue(false);

    const result = getApiErrorMessage(null);

    expect(result).toBe('An unexpected error occurred');
  });

  it('returns fallback message for numeric error values', () => {
    mockIsAxiosError.mockReturnValue(false);

    const result = getApiErrorMessage(42);

    expect(result).toBe('An unexpected error occurred');
  });
});

describe('setApiToken', () => {
  it('is a callable function', () => {
    expect(typeof setApiToken).toBe('function');
  });

  it('can be called with a token string without throwing', () => {
    expect(() => setApiToken('test-jwt-token')).not.toThrow();
  });

  it('can be called with null without throwing', () => {
    expect(() => setApiToken(null)).not.toThrow();
  });
});

describe('registerAuthCallbacks', () => {
  it('is a callable function', () => {
    expect(typeof registerAuthCallbacks).toBe('function');
  });

  it('can be called with callbacks without throwing', () => {
    const callbacks = {
      onTokenRefreshed: jest.fn(),
      onLogout: jest.fn(),
    };
    expect(() => registerAuthCallbacks(callbacks)).not.toThrow();
  });
});

describe('api instance', () => {
  it('is an axios instance', () => {
    expect(api).toBeDefined();
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
    expect(typeof api.put).toBe('function');
    expect(typeof api.delete).toBe('function');
  });
});
