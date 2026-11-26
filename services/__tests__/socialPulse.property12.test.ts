import * as fc from 'fast-check';
import * as Sentry from '@sentry/react-native';
import { ReactionReturnSchema } from '@/services/api/schemas/gasp.schema';
import { validateResponse } from '@/services/api/schemas/common.schema';

jest.mock('@sentry/react-native', () => ({ captureMessage: jest.fn() }));

describe('Feature: gasps-social-pulse, Property 12: API response schema validation', () => {
  it('captures exactly one Sentry warning for every malformed payload', () => {
    fc.assert(fc.property(fc.anything(), (value) => {
      const invalid = { arbitrary: value };
      jest.mocked(Sentry.captureMessage).mockClear();
      expect(validateResponse(ReactionReturnSchema, invalid, 'property-12')).toBe(invalid);
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    }), { numRuns: 100 });
  });
});
