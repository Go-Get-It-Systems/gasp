export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export function getNotificationPermissionSummary(status: NotificationPermissionStatus): 'enabled' | 'disabled' | 'not_configured' {
  if (status === 'granted') return 'enabled';
  if (status === 'denied') return 'disabled';
  return 'not_configured';
}
