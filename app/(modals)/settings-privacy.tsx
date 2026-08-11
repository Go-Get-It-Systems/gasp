import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ShieldOff } from 'lucide-react-native';
import { SettingsDetailLayout } from '@/components/settings/SettingsDetailLayout';
import { SettingsInfoCard } from '@/components/settings/SettingsInfoCard';
import { SettingsActionRow } from '@/components/settings/SettingsActionRow';
import { colors } from '@/constants/colors';

export default function SettingsPrivacyScreen() {
  const { t } = useTranslation();

  return (
    <SettingsDetailLayout title={t('settings.privacy.title')} backLabel={t('settings.back')}>
      <SettingsInfoCard title={t('settings.privacy.friendsOnlyTitle')} body={t('settings.privacy.friendsOnlyBody')} />
      <SettingsInfoCard title={t('settings.privacy.ephemeralTitle')} body={t('settings.privacy.ephemeralBody')} />
      <SettingsActionRow
        title={t('safety.blockedUsers.entry')}
        subtitle={t('safety.blockedUsers.entrySubtitle')}
        accessibilityLabel={t('safety.blockedUsers.entry')}
        icon={<ShieldOff size={20} color={colors.textSecondary} />}
        onPress={() => router.push('/(modals)/settings-blocked-users')}
      />
    </SettingsDetailLayout>
  );
}
