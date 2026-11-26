import * as fc from 'fast-check';
import { sortOpenNow } from '@/services/socialPulse';
import { gaspArbitrary } from '@/test-utils/socialPulseArbitraries';

describe('Feature: gasps-social-pulse, Property 4: open-now ordering', () => {
  it('orders every list newest first with a deterministic id tie-breaker', () => {
    fc.assert(fc.property(fc.array(gaspArbitrary, { maxLength: 40 }), (gasps) => {
      const sorted = sortOpenNow(gasps);
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1]!;
        const current = sorted[index]!;
        const previousTime = new Date(previous.createdAt).getTime();
        const currentTime = new Date(current.createdAt).getTime();
        expect(previousTime > currentTime || (previousTime === currentTime && previous.id.localeCompare(current.id) >= 0)).toBe(true);
      }
    }), { numRuns: 100 });
  });
});
