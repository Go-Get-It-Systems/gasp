import type { GaspStatus } from '../../shared/types.js';

interface GaspOpenView {
  status: GaspStatus;
  expiresAt: Date;
  replayable: boolean;
}

export type OpenTransition =
  | { kind: 'reject'; reason: 'expired' }
  | {
      kind: 'noop';
      reason: 'already-opened' | 'already-viewed-non-replayable' | 'already-reacted-non-replayable';
    }
  | { kind: 'transition' };

export function resolveOpenTransition(gasp: GaspOpenView, now: Date): OpenTransition {
  if (gasp.expiresAt <= now || gasp.status === 'expired') {
    return { kind: 'reject', reason: 'expired' };
  }
  if (gasp.status === 'opened') {
    return { kind: 'noop', reason: 'already-opened' };
  }
  if (gasp.status === 'viewed' && !gasp.replayable) {
    return { kind: 'noop', reason: 'already-viewed-non-replayable' };
  }
  if (gasp.status === 'reacted' && !gasp.replayable) {
    return { kind: 'noop', reason: 'already-reacted-non-replayable' };
  }
  return { kind: 'transition' };
}

export type CloseViewTransition = { kind: 'noop' } | { kind: 'transition' };

export function resolveCloseViewTransition(gasp: { status: GaspStatus }): CloseViewTransition {
  if (gasp.status !== 'opened') return { kind: 'noop' };
  return { kind: 'transition' };
}

export type ReactionStatusUpdate = { kind: 'noop' } | { kind: 'update' };

export function resolveReactionStatusUpdate(gasp: { status: GaspStatus }): ReactionStatusUpdate {
  if (gasp.status === 'pending' || gasp.status === 'opened') return { kind: 'update' };
  return { kind: 'noop' };
}
