const TRANSIENT_CODES: ReadonlySet<string> = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETDOWN',
  'ENETUNREACH',
  'EPIPE',
  '57P03',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
]);

const TRANSIENT_MESSAGE_PATTERNS: readonly RegExp[] = [
  /the database system is starting up/i,
  /the database system is shutting down/i,
  /connection terminated/i,
  /connection reset/i,
  /connection refused/i,
];

export function isTransientDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  if (typeof e.code === 'string' && TRANSIENT_CODES.has(e.code)) return true;
  if (typeof e.message === 'string') {
    for (const pattern of TRANSIENT_MESSAGE_PATTERNS) {
      if (pattern.test(e.message)) return true;
    }
  }
  return false;
}

export interface WithRetryOptions {
  maxAttempts?: number;
  delayMs?: (attemptNumber: number) => number;
  isRetriable?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: WithRetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const delayMs = options.delayMs ?? ((n) => Math.min(500 * 2 ** (n - 1), 4000));
  const isRetriable = options.isRetriable ?? isTransientDatabaseError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetriable(error) || attempt === maxAttempts) {
        throw error;
      }
      const wait = delayMs(attempt);
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }
  throw new Error('withRetry: unreachable');
}
