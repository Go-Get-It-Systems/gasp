import { AxiosError, AxiosHeaders } from 'axios';
import { isTransientError } from './queryHelpers';

function makeAxiosError(status?: number): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers };
  if (status === undefined) {
    return new AxiosError('Network Error', 'ERR_NETWORK', config);
  }
  return new AxiosError(
    `Request failed with status ${status}`,
    'ERR_BAD_RESPONSE',
    config,
    null,
    {
      status,
      data: {},
      statusText: '',
      headers,
      config,
    },
  );
}

describe('isTransientError', () => {
  test('returns true for 500 Internal Server Error', () => {
    expect(isTransientError(makeAxiosError(500))).toBe(true);
  });

  test('returns true for 502 Bad Gateway', () => {
    expect(isTransientError(makeAxiosError(502))).toBe(true);
  });

  test('returns true for 503 Service Unavailable', () => {
    expect(isTransientError(makeAxiosError(503))).toBe(true);
  });

  test('returns true for network error (no response)', () => {
    expect(isTransientError(makeAxiosError(undefined))).toBe(true);
  });

  test('returns false for 429 Too Many Requests (rate limit)', () => {
    expect(isTransientError(makeAxiosError(429))).toBe(false);
  });

  test('returns false for 400 Bad Request', () => {
    expect(isTransientError(makeAxiosError(400))).toBe(false);
  });

  test('returns false for 401 Unauthorized', () => {
    expect(isTransientError(makeAxiosError(401))).toBe(false);
  });

  test('returns false for 404 Not Found', () => {
    expect(isTransientError(makeAxiosError(404))).toBe(false);
  });

  test('returns false for 409 Conflict', () => {
    expect(isTransientError(makeAxiosError(409))).toBe(false);
  });

  test('returns false for non-axios Error', () => {
    expect(isTransientError(new Error('plain error'))).toBe(false);
  });

  test('returns false for unknown thrown value', () => {
    expect(isTransientError('string')).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
    expect(isTransientError(42)).toBe(false);
  });
});
