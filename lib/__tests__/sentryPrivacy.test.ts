import { getSentryPrivacyOptions } from '../sentryPrivacy';

describe('Sentry privacy', () => {
  it('disables development telemetry and screenshot attachments', () => {
    expect(getSentryPrivacyOptions(true)).toEqual({ enabled: false, attachScreenshot: false });
  });

  it('allows release telemetry without screenshot attachments', () => {
    expect(getSentryPrivacyOptions(false)).toEqual({ enabled: true, attachScreenshot: false });
  });
});
