import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { BusinessCampaign } from '@/services/api/schemas/business.schema';
import { campaignComposerStyles as styles } from './campaignComposerStyles';

export function CampaignPublished({ campaign }: { campaign: BusinessCampaign }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const live = campaign.state === 'live';
  return <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
    <CheckCircle2 size={56} color={colors.success} />
    <Text style={styles.successTitle}>{t(live ? 'business.campaignPublished' : 'business.campaignSubmitted')}</Text>
    <Text style={styles.successBody}>{t(live ? 'business.campaignPublishedBody' : 'business.campaignSubmittedBody')}</Text>
    <Pressable style={styles.doneBtn} onPress={() => router.dismissTo('/(tabs)/studio')}
      accessibilityRole="button" accessibilityLabel={t('business.backToStudio')}>
      <Text style={styles.doneBtnText}>{t('business.backToStudio')}</Text>
    </Pressable>
  </View>;
}
