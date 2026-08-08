import { getNotificationPermissionSummary } from '../notificationPermission';

describe('getNotificationPermissionSummary', () => {
  it('maps each device permission state to a user-facing settings state', () => {
    expect(getNotificationPermissionSummary('granted')).toBe('enabled');
    expect(getNotificationPermissionSummary('denied')).toBe('disabled');
    expect(getNotificationPermissionSummary('undetermined')).toBe('not_configured');
  });
});
