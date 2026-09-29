import { router } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SettingsActionRow } from '@/components/settings/SettingsActionRow';
import { SettingsDetailLayout } from '@/components/settings/SettingsDetailLayout';
import { SettingsInfoCard } from '@/components/settings/SettingsInfoCard';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';

function maskPhoneNumber(phoneNumber?: string): string {
  if (!phoneNumber) return '';
  return `•••• ${phoneNumber.slice(-4)}`;
}

export default function SettingsAccountScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  return (
    <SettingsDetailLayout title={t('settings.account.title')} backLabel={t('settings.back')}>
      <SettingsActionRow
        title={t('settings.account.editProfile')}
        subtitle={t('settings.account.editProfileSubtitle')}
        accessibilityLabel={t('settings.account.editProfile')}
        onPress={() => router.push('/(modals)/edit-profile')}
        icon={<UserRound size={20} color={colors.primary} />}
      />
      {user?.phoneNumber ? (
        <SettingsInfoCard
          title={t('settings.account.phoneNumber')}
          body={maskPhoneNumber(user.phoneNumber)}
        />
      ) : null}
    </SettingsDetailLayout>
  );
}
