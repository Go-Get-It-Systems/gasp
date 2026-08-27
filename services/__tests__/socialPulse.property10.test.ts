import * as fc from 'fast-check';
import { ReactionReturnSchema } from '@/services/api/schemas/gasp.schema';
import { reactionReturnArbitrary } from '@/test-utils/socialPulseArbitraries';

describe('Feature: gasps-social-pulse, Property 10: ReactionReturn schema completeness', () => {
  it('accepts valid records with nullable continuation context', () => {
    fc.assert(fc.property(reactionReturnArbitrary, (reaction) => {
      expect(ReactionReturnSchema.safeParse(reaction).success).toBe(true);
    }), { numRuns: 100 });
  });
});
