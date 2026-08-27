import { describe, test, expect, vi } from 'vitest';
import { withRetry, isTransientDatabaseError } from './with-retry.js';

describe('isTransientDatabaseError', () => {
  test('identifies "the database system is starting up" as transient', () => {
    const error = new Error('the database system is starting up');
    expect(isTransientDatabaseError(error)).toBe(true);
  });

  test('identifies "the database system is shutting down" as transient', () => {
    const error = new Error('the database system is shutting down');
    expect(isTransientDatabaseError(error)).toBe(true);
  });

  test('identifies Postgres SQLSTATE 57P03 (cannot_connect_now) as transient', () => {
    const error = Object.assign(new Error('cannot connect'), { code: '57P03' });
    expect(isTransientDatabaseError(error)).toBe(true);
  });

  test('identifies Postgres SQLSTATE 08006 (connection_failure) as transient', () => {
    const error = Object.assign(new Error('connection failure'), { code: '08006' });
    expect(isTransientDatabaseError(error)).toBe(true);
  });

  test('identifies ECONNRESET as transient', () => {
    const error = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
    expect(isTransientDatabaseError(error)).toBe(true);
  });

  test('identifies ECONNREFUSED as transient', () => {
    const error = Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
    expect(isTransientDatabaseError(error)).toBe(true);
  });

  test('does NOT identify foreign-key violation (23503) as transient', () => {
    const error = Object.assign(new Error('FK violation'), { code: '23503' });
    expect(isTransientDatabaseError(error)).toBe(false);
  });

  test('does NOT identify unique violation (23505) as transient', () => {
    const error = Object.assign(new Error('duplicate key'), { code: '23505' });
    expect(isTransientDatabaseError(error)).toBe(false);
  });

  test('does NOT identify a generic error message as transient', () => {
    const error = new Error('something else went wrong');
    expect(isTransientDatabaseError(error)).toBe(false);
  });

  test('returns false for non-error inputs', () => {
    expect(isTransientDatabaseError(undefined)).toBe(false);
    expect(isTransientDatabaseError(null)).toBe(false);
    expect(isTransientDatabaseError('a string')).toBe(false);
    expect(isTransientDatabaseError(42)).toBe(false);
  });
});

describe('withRetry', () => {
  test('returns result on first success without retry', async () => {
    const fn = vi.fn(async () => 'ok');
    const result = await withRetry(fn, { delayMs: () => 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on transient error and returns success', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) throw new Error('the database system is starting up');
      return 'ok';
    };
    const result = await withRetry(fn, { delayMs: () => 0 });
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  test('does NOT retry on non-transient error and rethrows', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw Object.assign(new Error('FK violation'), { code: '23503' });
    };
    await expect(withRetry(fn, { delayMs: () => 0 })).rejects.toThrow('FK violation');
    expect(attempts).toBe(1);
  });

  test('gives up after maxAttempts and throws the last transient error', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error(`the database system is starting up (attempt ${attempts})`);
    };
    await expect(withRetry(fn, { maxAttempts: 3, delayMs: () => 0 })).rejects.toThrow(/attempt 3/);
    expect(attempts).toBe(3);
  });

  test('uses default maxAttempts of 3 when not specified', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error('the database system is starting up');
    };
    await expect(withRetry(fn, { delayMs: () => 0 })).rejects.toThrow();
    expect(attempts).toBe(3);
  });

  test('calls delayMs with the attempt number between retries', async () => {
    const recordedDelays: number[] = [];
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('the database system is starting up');
      return 'ok';
    };
    const delayMs = (attempt: number) => {
      const d = attempt * 10;
      recordedDelays.push(d);
      return d;
    };
    await withRetry(fn, { maxAttempts: 3, delayMs });
    expect(recordedDelays).toEqual([10, 20]);
  });

  test('accepts custom isRetriable predicate', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw Object.assign(new Error('custom transient'), { custom: true });
    };
    await expect(
      withRetry(fn, {
        maxAttempts: 2,
        delayMs: () => 0,
        isRetriable: (e) => (e as { custom?: boolean })?.custom === true,
      }),
    ).rejects.toThrow('custom transient');
    expect(attempts).toBe(2);
  });
});
