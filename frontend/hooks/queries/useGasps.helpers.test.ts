import type { Gasp } from '@/services/api/schemas/gasp.schema';
import {
    removeFromList,
    shouldKeepInPendingAfterClose,
    updateGaspInList,
} from './useGasps.helpers';

const NOW = new Date('2026-05-16T12:00:00Z');
const FUTURE = '2026-12-01T00:00:00Z';
const PAST = '2024-01-01T00:00:00Z';

function makeGasp(overrides: Partial<Gasp> = {}): Gasp {
  return {
    id: 'g1',
    senderId: 'u1',
    senderName: 'Alice',
    senderAvatarUrl: null,
    imageUrl: 'https://example.com/a.jpg',
    imageUri: 'https://example.com/a.jpg',
    mediaType: 'image',
    blurhash: '',
    replayable: false,
    status: 'pending',
    deliveryStatus: 'sent',
    createdAt: '2026-05-16T11:00:00Z',
    expiresAt: FUTURE,
    ...overrides,
  };
}

describe('updateGaspInList', () => {
  test('returns empty array if list is undefined', () => {
    const updated = makeGasp({ status: 'opened' });
    expect(updateGaspInList(undefined, updated)).toEqual([]);
  });

  test('returns empty array if list is empty', () => {
    const updated = makeGasp({ status: 'opened' });
    expect(updateGaspInList([], updated)).toEqual([]);
  });

  test('replaces gasp with same id (merged fields)', () => {
    const original = makeGasp({ id: 'g1', status: 'pending' });
    const other = makeGasp({ id: 'g2', status: 'pending' });
    const updated = makeGasp({ id: 'g1', status: 'opened' });
    const result = updateGaspInList([original, other], updated);
    expect(result).toHaveLength(2);
    expect(result[0]?.status).toBe('opened');
    expect(result[1]?.id).toBe('g2');
  });

  test('leaves list unchanged if updated gasp not present', () => {
    const list = [makeGasp({ id: 'g1' })];
    const updated = makeGasp({ id: 'g999', status: 'opened' });
    expect(updateGaspInList(list, updated)).toEqual(list);
  });
});

describe('removeFromList', () => {
  test('returns empty array if list undefined', () => {
    expect(removeFromList(undefined, 'g1')).toEqual([]);
  });

  test('removes gasp with matching id', () => {
    const a = makeGasp({ id: 'g1' });
    const b = makeGasp({ id: 'g2' });
    const result = removeFromList([a, b], 'g1');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('g2');
  });

  test('leaves list unchanged if id not present', () => {
    const a = makeGasp({ id: 'g1' });
    expect(removeFromList([a], 'g999')).toEqual([a]);
  });
});

describe('shouldKeepInPendingAfterClose', () => {
  test('non-replayable → false (remove)', () => {
    const g = makeGasp({ replayable: false, expiresAt: FUTURE });
    expect(shouldKeepInPendingAfterClose(g, NOW)).toBe(false);
  });

  test('replayable + not expired → true (keep)', () => {
    const g = makeGasp({ replayable: true, expiresAt: FUTURE });
    expect(shouldKeepInPendingAfterClose(g, NOW)).toBe(true);
  });

  test('replayable + expired → false (remove)', () => {
    const g = makeGasp({ replayable: true, expiresAt: PAST });
    expect(shouldKeepInPendingAfterClose(g, NOW)).toBe(false);
  });
});
