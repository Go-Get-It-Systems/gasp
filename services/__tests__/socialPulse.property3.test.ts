import * as fc from 'fast-check';
import { getPrivacySafeImageSource } from '@/services/socialPulse';

describe('Feature: gasps-social-pulse, Property 3: media privacy', () => {
  it('never includes the original media URL in a list preview source', () => {
    fc.assert(fc.property(fc.webUrl(), fc.option(fc.string({ minLength: 1 }), { nil: null }), (originalUrl, blurhash) => {
      const source = getPrivacySafeImageSource(blurhash);
      expect(JSON.stringify(source) ?? '').not.toContain(originalUrl);
      expect(source).toEqual(blurhash ? { blurhash } : undefined);
    }), { numRuns: 100 });
  });
});
