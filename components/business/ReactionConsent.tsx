import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { businessStyles } from './BusinessUI';

export function ReactionConsent({ value, onChange, disabled }: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return <View style={businessStyles.card}>
    <Text>{t('business.consent')}</Text>
    <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={t('business.consent')} accessibilityHint={t('business.consentHint')} />
    <Text style={businessStyles.muted}>{t('business.consentHint')}</Text>
    <Text style={businessStyles.muted}>{t('business.storageNotice')}</Text>
  </View>;
}
