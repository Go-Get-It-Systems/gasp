import { AxiosError, AxiosHeaders } from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OPEN_RETRY_DELAYS_MS, useOpenGasp } from '../useGasps';

const mockedUseMutation = useMutation as jest.Mock;
const mockedUseQueryClient = useQueryClient as jest.Mock;

type RetryOptions = {
  retry: (failureCount: number, error: unknown) => boolean;
  retryDelay: (attempt: number) => number;
};

function httpError(status?: number) {
  const error = new AxiosError('request failed');
  if (status) {
    error.response = { status, data: {}, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
  }
  return error;
}

describe('useOpenGasp', () => {
  let options: RetryOptions;

  beforeEach(() => {
    mockedUseQueryClient.mockReturnValue({ setQueryData: jest.fn() });
    mockedUseMutation.mockImplementation((opts) => opts);
    options = useOpenGasp() as unknown as RetryOptions;
  });

  // Seen in production: a Postgres connect timeout made open return 500, the
  // gasp stayed "pending" and would have been offered to the viewer again.
  it('retries server errors and network failures with backoff', () => {
    expect(options.retry(0, httpError(500))).toBe(true);
    expect(options.retry(2, httpError(503))).toBe(true);
    expect(options.retry(0, httpError())).toBe(true);
    expect(OPEN_RETRY_DELAYS_MS.map((_, i) => options.retryDelay(i))).toEqual([500, 1500, 3000]);
  });

  it('gives up after the last delay', () => {
    expect(options.retry(OPEN_RETRY_DELAYS_MS.length, httpError(500))).toBe(false);
  });

  it('does not retry a refusal such as an expired gasp', () => {
    expect(options.retry(0, httpError(403))).toBe(false);
  });
});
