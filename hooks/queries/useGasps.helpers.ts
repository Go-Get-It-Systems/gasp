import type { Gasp } from '@/services/api/schemas/gasp.schema';

export function updateGaspInList(list: Gasp[] | undefined, updated: Gasp): Gasp[] {
  if (!list) return [];
  return list.map((g) => {
    if (g.id !== updated.id) return g;
    // open/close-view responses carry the bare gasp row without the sender
    // join; keep the sender identity the list already has.
    return {
      ...g,
      ...updated,
      senderName: updated.senderName || g.senderName,
      senderAvatarUrl: updated.senderAvatarUrl ?? g.senderAvatarUrl,
      blurhash: updated.blurhash || g.blurhash,
    };
  });
}

export function removeFromList(list: Gasp[] | undefined, gaspId: string): Gasp[] {
  if (!list) return [];
  return list.filter((g) => g.id !== gaspId);
}

export function shouldKeepInPendingAfterClose(gasp: Gasp, now: Date): boolean {
  if (!gasp.replayable) return false;
  return new Date(gasp.expiresAt) > now;
}

/**
 * The pending gasp a viewer link refers to. Deliberately no fallback to
 * another pending gasp: opening (and consuming) the wrong one is worse than
 * reporting that the requested gasp is gone.
 */
export function findPendingGasp(list: Gasp[] | undefined, gaspId: string | undefined): Gasp | null {
  if (!gaspId || !list) return null;
  return list.find((g) => g.id === gaspId) ?? null;
}

/** The pending gasp whose media a chat gasp message points to (same upload URL). */
export function findPendingGaspByMedia(list: Gasp[] | undefined, mediaUrl: string | undefined): Gasp | null {
  if (!mediaUrl || !list) return null;
  return list.find((g) => g.imageUrl === mediaUrl) ?? null;
}

/**
 * Whether a received chat gasp can still be opened. The server's pending
 * list is the source of truth once loaded: it drops view-once gasps after
 * they are viewed and keeps replayable ones until they expire, on every
 * device. Before it loads, fall back to this device's local "viewed" mark.
 */
export function isChatGaspOpenable(options: {
  pendingLoaded: boolean;
  pendingMatch: Gasp | null;
  viewedLocally: boolean;
}): boolean {
  const { pendingLoaded, pendingMatch, viewedLocally } = options;
  if (!pendingLoaded) return !viewedLocally;
  if (!pendingMatch) return false;
  return pendingMatch.replayable || !viewedLocally;
}
