import * as fc from 'fast-check';
import { queryKeys } from '@/services/queryKeys';
import { invalidateSocialPulseReactionCaches } from '@/services/socialPulseCache';

describe('Feature: gasps-social-pulse, Property 11: reaction socket cache invalidation', () => {
  it('invalidates both server-authoritative caches for every event repetition', async () => {
    await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (eventCount) => {
      const invalidateQueries = jest.fn().mockResolvedValue(undefined);
      for (let index = 0; index < eventCount; index += 1) {
        await invalidateSocialPulseReactionCaches({ invalidateQueries } as never);
      }
      expect(invalidateQueries).toHaveBeenCalledTimes(eventCount * 2);
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.reactions.received });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.gasps.latestMoment });
    }), { numRuns: 100 });
  });
});
