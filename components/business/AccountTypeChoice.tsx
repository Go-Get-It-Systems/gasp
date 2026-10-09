import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { BusinessButton, businessStyles } from './BusinessUI';

export function AccountTypeChoice({ value, onChange, disabled }: { value: 'personal' | 'business'; onChange: (type: 'personal' | 'business') => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return <View style={businessStyles.section}>
    <Text variant="label">{t('business.accountType')}</Text>
    <View style={businessStyles.row}>
      <BusinessButton label={t('business.personalAccount')} selected={value === 'personal'} disabled={disabled} onPress={() => onChange('personal')} />
      <BusinessButton label={t('business.businessAccount')} selected={value === 'business'} disabled={disabled} onPress={() => onChange('business')} />
    </View>
    <Text variant="caption">{t('business.accountHint')}</Text>
  </View>;
}
