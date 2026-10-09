import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBusinessCampaign, useCampaignMetrics, useOwnerCampaignReactions } from '@/hooks/queries/useBusiness';
import { BusinessButton, BusinessQuery, BusinessScreen, businessStyles } from '@/components/business/BusinessUI';
import { ReactionGallery } from '@/components/business/ReactionGallery';
import { Text } from '@/components/ui/Text';

export default function CampaignDashboard() {
  const { workspaceId = '', campaignId = '' } = useLocalSearchParams<{ workspaceId: string; campaignId: string }>();
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState(false);
  const campaign = useBusinessCampaign(workspaceId, campaignId);
  const metrics = useCampaignMetrics(workspaceId, campaignId);
  const reactions = useOwnerCampaignReactions(workspaceId, campaignId, selected);
  return <BusinessScreen title={campaign.data?.title ?? t('business.metrics')}>
    <BusinessQuery query={metrics}>{(data) => <View style={businessStyles.card}>
      <Text variant="subtitle">{t('business.metrics')}</Text><Text>{t('business.audience')}: {data.audienceSnapshotCount}</Text>
      <View style={businessStyles.row}>{Object.entries(data.counts).map(([key, count]) => <Text key={key}>{t(`business.${key}`)}: {count}</Text>)}</View>
      <View style={businessStyles.row}>{Object.entries(data.metrics).map(([key, rate]) => <Text key={key}>{t(`business.${key}`)}: {rate.toLocaleString(i18n.language, { maximumFractionDigits: 1 })}%</Text>)}</View>
      <Text style={businessStyles.muted}>{t('business.rateHint')}</Text>
    </View>}</BusinessQuery>
    <Text variant="subtitle">{t('business.reactions')}</Text><Text style={businessStyles.muted}>{t('business.pinHint')}</Text>
    <View style={businessStyles.row}>
      <BusinessButton label={t('business.allReactions')} selected={!selected} onPress={() => setSelected(false)} />
      <BusinessButton label={t('business.selectedOnly')} selected={selected} onPress={() => setSelected(true)} />
    </View>
    <BusinessQuery query={reactions} empty={t('business.emptyReactions')}>{(rows) => <ReactionGallery workspaceId={workspaceId} reactions={rows} owner />}</BusinessQuery>
  </BusinessScreen>;
}
