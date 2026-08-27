import type { Gasp } from '@/services/api/schemas/gasp.schema';

export function updateGaspInList(list: Gasp[] | undefined, updated: Gasp): Gasp[] {
  if (!list) return [];
  return list.map((g) => (g.id === updated.id ? { ...g, ...updated } : g));
}

export function removeFromList(list: Gasp[] | undefined, gaspId: string): Gasp[] {
  if (!list) return [];
  return list.filter((g) => g.id !== gaspId);
}

export function shouldKeepInPendingAfterClose(gasp: Gasp, now: Date): boolean {
  if (!gasp.replayable) return false;
  return new Date(gasp.expiresAt) > now;
}
