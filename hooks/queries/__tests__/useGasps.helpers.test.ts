import { findPendingGasp } from '@/hooks/queries/useGasps.helpers';
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
