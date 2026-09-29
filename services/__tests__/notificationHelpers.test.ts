import {
    computeElapsedFraction,
    deriveInboxPulseState,
    formatDeliveryStatus,
    formatReminderMessage,
    resolveIndicatorColor,
    resolveRingColor,
} from '@/services/notificationHelpers';
import fc from 'fast-check';

describe('resolveIndicatorColor', () => {
  it('returns purple for chat', () => {
    expect(resolveIndicatorColor('chat')).toBe('#7C3AED');
  });

  it('returns red for gasp', () => {
    expect(resolveIndicatorColor('gasp')).toBe('#EF4444');
  });

  it('returns cyan for reaction', () => {
    expect(resolveIndicatorColor('reaction')).toBe('#06B6D4');
  });
});

describe('computeElapsedFraction', () => {
  it('returns 0 when no time has elapsed', () => {
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    expect(computeElapsedFraction(createdAt, now)).toBe(0);
  });

  it('returns 0.5 at 12 hours elapsed', () => {
    const now = Date.now();
    const createdAt = new Date(now - 12 * 60 * 60 * 1000).toISOString();
    expect(computeElapsedFraction(createdAt, now)).toBeCloseTo(0.5);
  });

  it('returns 1.0 at 24 hours elapsed', () => {
    const now = Date.now();
    const createdAt = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    expect(computeElapsedFraction(createdAt, now)).toBe(1.0);
  });

  it('clamps to 1.0 beyond 24 hours', () => {
    const now = Date.now();
    const createdAt = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    expect(computeElapsedFraction(createdAt, now)).toBe(1.0);
  });

  it('clamps to 0 for future createdAt', () => {
    const now = Date.now();
    const createdAt = new Date(now + 1000).toISOString();
    expect(computeElapsedFraction(createdAt, now)).toBe(0);
  });
});

describe('resolveRingColor', () => {
  it('returns purple when more than 1 hour remains', () => {
    expect(resolveRingColor(0.5)).toBe('#7C3AED');
  });

  it('returns purple just below the 23/24 threshold', () => {
    expect(resolveRingColor(22 / 24)).toBe('#7C3AED');
  });

  it('returns red at exactly the 23/24 threshold', () => {
    expect(resolveRingColor(23 / 24)).toBe('#EF4444');
  });

  it('returns red when nearly expired', () => {
    expect(resolveRingColor(0.99)).toBe('#EF4444');
  });

  it('returns red at 1.0 (expired)', () => {
    expect(resolveRingColor(1.0)).toBe('#EF4444');
  });
});

describe('deriveInboxPulseState', () => {
  it('returns false for empty array', () => {
    expect(deriveInboxPulseState([])).toBe(false);
  });

  it('returns true for non-empty array', () => {
    expect(deriveInboxPulseState([{ id: '1' }])).toBe(true);
  });
});


// ── Property-Based Tests ──────────────────────────────────────────────────────

describe('Property-Based Tests', () => {
  // Feature: gasp-notifications, Property 3: Content type indicator color mapping
  it('Property 3: resolveIndicatorColor returns the correct hex color for any content type', () => {
    const expectedColors: Record<'chat' | 'gasp' | 'reaction', string> = {
      chat: '#7C3AED',
      gasp: '#EF4444',
      reaction: '#06B6D4',
    };

    fc.assert(
      fc.property(
        fc.constantFrom('chat' as const, 'gasp' as const, 'reaction' as const),
        (type) => {
          const result = resolveIndicatorColor(type);
          expect(result).toBe(expectedColors[type]);
        }
      )
    );
  });

  // Feature: gasp-notifications, Property 5: Countdown ring elapsed fraction computation
  it('Property 5: computeElapsedFraction equals Math.min(1.0, (now - Date.parse(createdAt)) / 86_400_000) and is in [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).filter((d) => !isNaN(d.getTime())),
        fc.integer({ min: 0, max: 172_800_000 }), // offset up to 48 hours
        (date, offset) => {
          const createdAt = date.toISOString();
          const now = date.getTime() + offset;

          const result = computeElapsedFraction(createdAt, now);
          const expected = Math.min(1.0, (now - Date.parse(createdAt)) / 86_400_000);

          expect(result).toBeCloseTo(expected, 10);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
        }
      )
    );
  });

  // Feature: gasp-notifications, Property 6: Countdown ring stroke color threshold
  it('Property 6: resolveRingColor returns #7C3AED when fraction < 23/24 and #EF4444 when fraction >= 23/24', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        (fraction) => {
          const result = resolveRingColor(fraction);
          if (fraction < 23 / 24) {
            expect(result).toBe('#7C3AED');
          } else {
            expect(result).toBe('#EF4444');
          }
        }
      )
    );
  });

  // Feature: gasp-notifications, Property 9: Reminder notification message format
  it('Property 9: formatReminderMessage returns exactly "${senderName} is waiting for your reaction"', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (senderName) => {
          const result = formatReminderMessage(senderName);
          expect(result).toBe(`${senderName} is waiting for your reaction`);
        }
      )
    );
  });

  // Feature: gasp-notifications, Property 10: Delivery status label is total and non-empty
  it('Property 10: formatDeliveryStatus returns a non-empty string and never throws for any valid status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('sent' as const, 'delivered' as const, 'opened' as const, undefined),
        (status) => {
          const result = formatDeliveryStatus(status);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        }
      )
    );
  });
});
