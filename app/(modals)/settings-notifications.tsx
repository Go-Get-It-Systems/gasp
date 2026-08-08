import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { BellRing, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SettingsActionRow } from '@/components/settings/SettingsActionRow';
import { SettingsDetailLayout } from '@/components/settings/SettingsDetailLayout';
import { SettingsInfoCard } from '@/components/settings/SettingsInfoCard';
import { getNotificationPermissionSummary, type NotificationPermissionStatus } from '@/services/notificationPermission';
import { colors } from '@/constants/colors';

export default function SettingsNotificationsScreen() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<NotificationPermissionStatus>('undetermined');

  const refreshPermission = useCallback(async () => {
    try {
      const result = await Notifications.getPermissionsAsync();
      setStatus(result.status as NotificationPermissionStatus);
    } catch (error) {
      Sentry.captureException(error, { extra: { context: 'settingsNotifications.refreshPermission' } });
      Alert.alert(t('common.error'), t('settings.notifications.statusError'));
    }
  }, [t]);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  const summary = getNotificationPermissionSummary(status);
  const statusText = t(`settings.notifications.status.${summary}`);

  const openSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Sentry.captureException(error, { extra: { context: 'settingsNotifications.openSystemSettings' } });
      Alert.alert(t('common.error'), t('settings.notifications.openSettingsError'));
    }
  };

  return (
    <SettingsDetailLayout title={t('settings.notifications.title')} backLabel={t('settings.back')}>
      <SettingsInfoCard title={t('settings.notifications.devicePermission')} body={statusText} />
      <SettingsActionRow
        title={t('settings.notifications.openDeviceSettings')}
        subtitle={t('settings.notifications.openDeviceSettingsSubtitle')}
        accessibilityLabel={t('settings.notifications.openDeviceSettings')}
        onPress={openSystemSettings}
        icon={<BellRing size={20} color={colors.accentPink} />}
      />
      <SettingsActionRow
        title={t('settings.notifications.refreshStatus')}
        subtitle={t('settings.notifications.refreshStatusSubtitle')}
        accessibilityLabel={t('settings.notifications.refreshStatus')}
        onPress={refreshPermission}
        icon={<RefreshCw size={20} color={colors.primary} />}
      />
      <SettingsInfoCard
        title={t('settings.notifications.preferencesTitle')}
        body={t('settings.notifications.preferencesBody')}
      />
    </SettingsDetailLayout>
  );
}
