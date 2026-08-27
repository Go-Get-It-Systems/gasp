import { describe, test, expect } from 'vitest';
import {
  resolveOpenTransition,
  resolveCloseViewTransition,
  resolveReactionStatusUpdate,
} from './gasps.transitions.js';

const FUTURE = new Date('2026-12-01T00:00:00Z');
const PAST = new Date('2024-01-01T00:00:00Z');
const NOW = new Date('2026-05-16T00:00:00Z');

describe('resolveOpenTransition', () => {
  test('pending gasp non-expired transitions to opened', () => {
    expect(
      resolveOpenTransition({ status: 'pending', expiresAt: FUTURE, replayable: false }, NOW),
    ).toEqual({ kind: 'transition' });
  });

  test('rejects when status is already expired', () => {
    expect(
      resolveOpenTransition({ status: 'expired', expiresAt: FUTURE, replayable: false }, NOW),
    ).toEqual({ kind: 'reject', reason: 'expired' });
  });

  test('rejects when expiresAt is in the past', () => {
    expect(
      resolveOpenTransition({ status: 'pending', expiresAt: PAST, replayable: false }, NOW),
    ).toEqual({ kind: 'reject', reason: 'expired' });
  });

  test('rejects exactly at expiresAt (boundary)', () => {
    expect(
      resolveOpenTransition({ status: 'pending', expiresAt: NOW, replayable: false }, NOW),
    ).toEqual({ kind: 'reject', reason: 'expired' });
  });

  test('already opened is a noop (idempotent)', () => {
    expect(
      resolveOpenTransition({ status: 'opened', expiresAt: FUTURE, replayable: false }, NOW),
    ).toEqual({ kind: 'noop', reason: 'already-opened' });
  });

  test('already viewed non-replayable is a noop', () => {
    expect(
      resolveOpenTransition({ status: 'viewed', expiresAt: FUTURE, replayable: false }, NOW),
    ).toEqual({ kind: 'noop', reason: 'already-viewed-non-replayable' });
  });

  test('already reacted non-replayable is a noop', () => {
    expect(
      resolveOpenTransition({ status: 'reacted', expiresAt: FUTURE, replayable: false }, NOW),
    ).toEqual({ kind: 'noop', reason: 'already-reacted-non-replayable' });
  });

  test('viewed + replayable allows reopen (transition)', () => {
    expect(
      resolveOpenTransition({ status: 'viewed', expiresAt: FUTURE, replayable: true }, NOW),
    ).toEqual({ kind: 'transition' });
  });

  test('reacted + replayable allows reopen (transition)', () => {
    expect(
      resolveOpenTransition({ status: 'reacted', expiresAt: FUTURE, replayable: true }, NOW),
    ).toEqual({ kind: 'transition' });
  });

  test('replayable + expired still rejected', () => {
    expect(
      resolveOpenTransition({ status: 'viewed', expiresAt: PAST, replayable: true }, NOW),
    ).toEqual({ kind: 'reject', reason: 'expired' });
  });
});

describe('resolveCloseViewTransition', () => {
  test('opened gasp transitions to viewed', () => {
    expect(resolveCloseViewTransition({ status: 'opened' })).toEqual({ kind: 'transition' });
  });

  test('pending is a noop (cliente fechou sem abrir)', () => {
    expect(resolveCloseViewTransition({ status: 'pending' })).toEqual({ kind: 'noop' });
  });

  test('viewed is a noop (já fechou antes)', () => {
    expect(resolveCloseViewTransition({ status: 'viewed' })).toEqual({ kind: 'noop' });
  });

  test('reacted is a noop (não sobrescreve reação)', () => {
    expect(resolveCloseViewTransition({ status: 'reacted' })).toEqual({ kind: 'noop' });
  });

  test('expired is a noop', () => {
    expect(resolveCloseViewTransition({ status: 'expired' })).toEqual({ kind: 'noop' });
  });
});

describe('resolveReactionStatusUpdate', () => {
  test('pending updates to reacted', () => {
    expect(resolveReactionStatusUpdate({ status: 'pending' })).toEqual({ kind: 'update' });
  });

  test('opened updates to reacted', () => {
    expect(resolveReactionStatusUpdate({ status: 'opened' })).toEqual({ kind: 'update' });
  });

  test('viewed is a noop (não sobrescreve)', () => {
    expect(resolveReactionStatusUpdate({ status: 'viewed' })).toEqual({ kind: 'noop' });
  });

  test('reacted is a noop (idempotent)', () => {
    expect(resolveReactionStatusUpdate({ status: 'reacted' })).toEqual({ kind: 'noop' });
  });

  test('expired is a noop (rejeitado em outra camada)', () => {
    expect(resolveReactionStatusUpdate({ status: 'expired' })).toEqual({ kind: 'noop' });
  });
});
