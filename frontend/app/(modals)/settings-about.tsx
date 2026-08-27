import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { SettingsDetailLayout } from '@/components/settings/SettingsDetailLayout';
import { SettingsInfoCard } from '@/components/settings/SettingsInfoCard';

export default function SettingsAboutScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? t('settings.about.versionUnavailable');

  return (
    <SettingsDetailLayout title={t('settings.about.title')} backLabel={t('settings.back')}>
      <SettingsInfoCard title={t('settings.about.version')} body={version} />
      <SettingsInfoCard title={t('settings.about.gaspTitle')} body={t('settings.about.gaspBody')} />
    </SettingsDetailLayout>
  );
}
