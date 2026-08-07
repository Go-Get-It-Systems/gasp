import { useTranslation } from 'react-i18next';
import { SettingsDetailLayout } from '@/components/settings/SettingsDetailLayout';
import { SettingsInfoCard } from '@/components/settings/SettingsInfoCard';

export default function SettingsPrivacyScreen() {
  const { t } = useTranslation();

  return (
    <SettingsDetailLayout title={t('settings.privacy.title')} backLabel={t('settings.back')}>
      <SettingsInfoCard title={t('settings.privacy.friendsOnlyTitle')} body={t('settings.privacy.friendsOnlyBody')} />
      <SettingsInfoCard title={t('settings.privacy.ephemeralTitle')} body={t('settings.privacy.ephemeralBody')} />
      <SettingsInfoCard title={t('settings.privacy.comingNextTitle')} body={t('settings.privacy.comingNextBody')} />
    </SettingsDetailLayout>
  );
}
