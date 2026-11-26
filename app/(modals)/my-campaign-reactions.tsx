import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useMyCampaignReactions } from '@/hooks/queries/useBusiness';
import { useCampaignConsent } from '@/hooks/queries/useBusinessMutations';
import { BusinessButton, BusinessError, BusinessQuery, BusinessScreen, businessStyles } from '@/components/business/BusinessUI';
import { CampaignMedia } from '@/components/business/CampaignMedia';
import { Text } from '@/components/ui/Text';
import type { MyCampaignReaction } from '@/services/api/schemas/business.schema';

function OwnReaction({ reaction }: { reaction: MyCampaignReaction }) {
  const { t } = useTranslation();
  const consent = useCampaignConsent(reaction.workspaceId, reaction.campaignId);
  return <View style={businessStyles.card}>
    <View style={businessStyles.section}>
      <Text variant="subtitle">{reaction.campaignTitle}</Text>
      <CampaignMedia uri={reaction.videoUrl} mediaType="video" />
      <Text style={businessStyles.muted}>{t('business.storageNotice')}</Text>
      {reaction.consentToFeature ? <BusinessButton label={t('business.withdraw')} disabled={consent.isPending} onPress={() => consent.mutate(false)} /> : <Text>{t('business.withdrawn')}</Text>}
      <BusinessError visible={consent.isError} />
    </View>
  </View>;
}
export default function MyCampaignReactions() {
  const { t } = useTranslation();
  const query = useMyCampaignReactions();
  return <BusinessScreen title={t('business.myReactions')}>
    <BusinessQuery query={{ ...query, data: query.data?.pages.flatMap((page) => page.data) }} empty={t('business.emptyReceipts')}>{(rows) => rows.map((reaction) => <OwnReaction key={reaction.id} reaction={reaction} />)}</BusinessQuery>
    {query.hasNextPage && <BusinessButton label={t(query.isFetchingNextPage ? 'common.loading' : 'business.loadMore')} disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} />}
  </BusinessScreen>;
}
