import * as fc from 'fast-check';
import { LatestMomentSchema } from '@/services/api/schemas/gasp.schema';
import { latestMomentArbitrary } from '@/test-utils/socialPulseArbitraries';

describe('Feature: gasps-social-pulse, Property 7: Moment completeness', () => {
  it('accepts complete generated Moment summaries', () => {
    fc.assert(fc.property(latestMomentArbitrary, (moment) => {
      expect(LatestMomentSchema.safeParse(moment).success).toBe(true);
    }), { numRuns: 100 });
  });
});
