import * as fc from 'fast-check';
import { getLatestMomentCards } from '@/services/socialPulse';
import { latestMomentArbitrary } from '@/test-utils/socialPulseArbitraries';

describe('Feature: gasps-social-pulse, Property 8: latest card uniqueness', () => {
  it('returns at most one latest Moment card', () => {
    fc.assert(fc.property(fc.option(latestMomentArbitrary, { nil: null }), (moment) => {
      const cards = getLatestMomentCards(moment);
      expect(cards.length).toBeLessThanOrEqual(1);
      if (moment) expect(cards[0]?.id).toBe(moment.id);
    }), { numRuns: 100 });
  });
});
