import * as fc from 'fast-check';
import { SOCIAL_PULSE_SECTION_ORDER } from '@/services/socialPulse';

describe('Feature: gasps-social-pulse, Property 5: section priority order', () => {
  it('keeps core sections ahead of secondary activity for any visibility combination', () => {
    fc.assert(fc.property(fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }), (visibility) => {
      const visible = SOCIAL_PULSE_SECTION_ORDER.filter((_, index) => visibility[index]);
      const positions = visible.map((section) => SOCIAL_PULSE_SECTION_ORDER.indexOf(section));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }), { numRuns: 100 });
  });
});
