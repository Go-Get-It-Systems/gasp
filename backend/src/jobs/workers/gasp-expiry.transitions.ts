import type { GaspStatus } from '../../shared/types.js';

export function shouldAutoClose(
  gasp: { status: GaspStatus; openedAt: Date | null },
  now: Date,
  windowMs: number,
): boolean {
  if (gasp.status !== 'opened') return false;
  if (!gasp.openedAt) return false;
  return now.getTime() - gasp.openedAt.getTime() >= windowMs;
}

export function shouldExpire(
  gasp: { status: GaspStatus; expiresAt: Date },
  now: Date,
): boolean {
  if (gasp.status !== 'pending' && gasp.status !== 'opened') return false;
  return gasp.expiresAt <= now;
}
