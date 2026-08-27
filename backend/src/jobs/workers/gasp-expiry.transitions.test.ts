import { describe, test, expect } from 'vitest';
import { shouldAutoClose, shouldExpire } from './gasp-expiry.transitions.js';

const NOW = new Date('2026-05-16T12:00:00Z');
const WINDOW_60S = 60_000;

describe('shouldAutoClose', () => {
  test('opened gasp older than window → true', () => {
    const openedAt = new Date(NOW.getTime() - 61_000); // 61s atrás
    expect(shouldAutoClose({ status: 'opened', openedAt }, NOW, WINDOW_60S)).toBe(true);
  });

  test('opened gasp at exactly window boundary → true', () => {
    const openedAt = new Date(NOW.getTime() - WINDOW_60S);
    expect(shouldAutoClose({ status: 'opened', openedAt }, NOW, WINDOW_60S)).toBe(true);
  });

  test('opened gasp younger than window → false', () => {
    const openedAt = new Date(NOW.getTime() - 30_000); // 30s atrás
    expect(shouldAutoClose({ status: 'opened', openedAt }, NOW, WINDOW_60S)).toBe(false);
  });

  test('opened gasp without openedAt → false (corrupted state, leave alone)', () => {
    expect(shouldAutoClose({ status: 'opened', openedAt: null }, NOW, WINDOW_60S)).toBe(false);
  });

  test('pending gasp → false (não foi aberto)', () => {
    const openedAt = new Date(NOW.getTime() - 120_000);
    expect(shouldAutoClose({ status: 'pending', openedAt }, NOW, WINDOW_60S)).toBe(false);
  });

  test('viewed gasp → false (já fechado)', () => {
    expect(
      shouldAutoClose({ status: 'viewed', openedAt: new Date(NOW.getTime() - 120_000) }, NOW, WINDOW_60S),
    ).toBe(false);
  });

  test('reacted gasp → false (reagiu)', () => {
    expect(
      shouldAutoClose({ status: 'reacted', openedAt: new Date(NOW.getTime() - 120_000) }, NOW, WINDOW_60S),
    ).toBe(false);
  });

  test('expired gasp → false (terminal)', () => {
    expect(
      shouldAutoClose({ status: 'expired', openedAt: new Date(NOW.getTime() - 120_000) }, NOW, WINDOW_60S),
    ).toBe(false);
  });
});

describe('shouldExpire', () => {
  test('pending gasp past expiresAt → true', () => {
    const expiresAt = new Date(NOW.getTime() - 1_000); // 1s atrás
    expect(shouldExpire({ status: 'pending', expiresAt }, NOW)).toBe(true);
  });

  test('opened gasp past expiresAt → true (TTL global)', () => {
    const expiresAt = new Date(NOW.getTime() - 1_000);
    expect(shouldExpire({ status: 'opened', expiresAt }, NOW)).toBe(true);
  });

  test('pending gasp before expiresAt → false', () => {
    const expiresAt = new Date(NOW.getTime() + 1_000);
    expect(shouldExpire({ status: 'pending', expiresAt }, NOW)).toBe(false);
  });

  test('viewed gasp past expiresAt → false (não-terminal, será limpo pelo cleanup)', () => {
    const expiresAt = new Date(NOW.getTime() - 1_000);
    expect(shouldExpire({ status: 'viewed', expiresAt }, NOW)).toBe(false);
  });

  test('reacted gasp past expiresAt → false', () => {
    const expiresAt = new Date(NOW.getTime() - 1_000);
    expect(shouldExpire({ status: 'reacted', expiresAt }, NOW)).toBe(false);
  });

  test('already-expired gasp → false (idempotent)', () => {
    const expiresAt = new Date(NOW.getTime() - 1_000);
    expect(shouldExpire({ status: 'expired', expiresAt }, NOW)).toBe(false);
  });

  test('exactly at expiresAt (boundary) → true', () => {
    expect(shouldExpire({ status: 'pending', expiresAt: NOW }, NOW)).toBe(true);
  });
});
