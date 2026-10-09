import { findPendingGasp, findPendingGaspByMedia, isChatGaspOpenable, updateGaspInList } from '@/hooks/queries/useGasps.helpers';
import type { Gasp } from '@/services/api/schemas/gasp.schema';

const gasp = (id: string) => ({ id }) as Gasp;

describe('findPendingGasp', () => {
  it('returns the gasp with the requested id', () => {
    expect(findPendingGasp([gasp('a'), gasp('b')], 'b')?.id).toBe('b');
  });

  it('does not fall back to another pending gasp when the id is missing', () => {
    expect(findPendingGasp([gasp('a'), gasp('b')], 'gone')).toBeNull();
  });

  it('returns null without an id or before the list has loaded', () => {
    expect(findPendingGasp([gasp('a')], undefined)).toBeNull();
    expect(findPendingGasp(undefined, 'a')).toBeNull();
  });
});

describe('findPendingGaspByMedia', () => {
  const withUrl = (id: string, imageUrl: string) => ({ id, imageUrl }) as Gasp;
  it('matches the pending gasp sharing the chat message media URL', () => {
    expect(findPendingGaspByMedia([withUrl('a', 'u1'), withUrl('b', 'u2')], 'u2')?.id).toBe('b');
    expect(findPendingGaspByMedia([withUrl('a', 'u1')], 'u9')).toBeNull();
    expect(findPendingGaspByMedia([withUrl('a', '')], undefined)).toBeNull();
  });
});

describe('isChatGaspOpenable', () => {
  const pending = (replayable: boolean) => ({ id: 'g', replayable }) as Gasp;

  it('uses the local viewed mark until the pending list loads', () => {
    expect(isChatGaspOpenable({ pendingLoaded: false, pendingMatch: null, viewedLocally: false })).toBe(true);
    expect(isChatGaspOpenable({ pendingLoaded: false, pendingMatch: null, viewedLocally: true })).toBe(false);
  });

  it('is not openable once the server no longer lists it (viewed elsewhere or expired)', () => {
    expect(isChatGaspOpenable({ pendingLoaded: true, pendingMatch: null, viewedLocally: false })).toBe(false);
  });

  it('keeps replayable gasps openable after viewing; view-once ones close', () => {
    expect(isChatGaspOpenable({ pendingLoaded: true, pendingMatch: pending(true), viewedLocally: true })).toBe(true);
    expect(isChatGaspOpenable({ pendingLoaded: true, pendingMatch: pending(false), viewedLocally: true })).toBe(false);
    expect(isChatGaspOpenable({ pendingLoaded: true, pendingMatch: pending(false), viewedLocally: false })).toBe(true);
  });
});

describe('updateGaspInList', () => {
  it('keeps the sender identity when the update comes from a bare gasp response', () => {
    const listed = { id: 'g', senderName: 'Bi', senderAvatarUrl: 'https://a/bi.jpg', blurhash: 'LKO2', status: 'pending' } as Gasp;
    const fromOpen = { id: 'g', senderName: '', senderAvatarUrl: null, blurhash: '', status: 'viewed' } as unknown as Gasp;

    const [merged] = updateGaspInList([listed], fromOpen);

    expect(merged.status).toBe('viewed');
    expect(merged.senderName).toBe('Bi');
    expect(merged.senderAvatarUrl).toBe('https://a/bi.jpg');
    expect(merged.blurhash).toBe('LKO2');
  });
});
