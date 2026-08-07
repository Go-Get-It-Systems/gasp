import { Alert, Linking } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { BookOpenText, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SettingsActionRow } from '@/components/settings/SettingsActionRow';
import { SettingsDetailLayout } from '@/components/settings/SettingsDetailLayout';
import { SettingsInfoCard } from '@/components/settings/SettingsInfoCard';
import { colors } from '@/constants/colors';

const TERMS_URL = 'https://gasp.app/terms';
const PRIVACY_URL = 'https://gasp.app/privacy';

export default function SettingsHelpScreen() {
  const { t } = useTranslation();

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Sentry.captureException(error, { extra: { context: 'settingsHelp.openLink', url } });
      Alert.alert(t('common.error'), t('settings.help.openLinkError'));
    }
  };

  return (
    <SettingsDetailLayout title={t('settings.help.title')} backLabel={t('settings.back')}>
      <SettingsActionRow
        title={t('settings.help.terms')}
        subtitle={t('settings.help.termsSubtitle')}
        accessibilityLabel={t('settings.help.terms')}
        onPress={() => openLink(TERMS_URL)}
        icon={<BookOpenText size={20} color={colors.warning} />}
      />
      <SettingsActionRow
        title={t('settings.help.privacy')}
        subtitle={t('settings.help.privacySubtitle')}
        accessibilityLabel={t('settings.help.privacy')}
        onPress={() => openLink(PRIVACY_URL)}
        icon={<ShieldCheck size={20} color={colors.accentCyan} />}
      />
      <SettingsInfoCard title={t('settings.help.reportProblemTitle')} body={t('settings.help.reportProblemBody')} />
    </SettingsDetailLayout>
  );
}
