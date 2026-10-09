import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BusinessCampaign, PublicCampaign } from '@/services/api/schemas/business.schema';
import { useCampaignAction } from '@/hooks/queries/useBusinessMutations';
import { openCampaignComposer, openCampaignDashboard, openCampaignViewer } from '@/services/navigation';
import { Text } from '@/components/ui/Text';
import { BusinessButton, BusinessError, businessStyles } from './BusinessUI';
import { CampaignMedia } from './CampaignMedia';

function OwnerActions({ campaign, followerCount }: { campaign: BusinessCampaign; followerCount: number }) {
  const { t } = useTranslation();
  const mutation = useCampaignAction(campaign.workspaceId, campaign.id);
  const confirm = (action: 'publish' | 'close' | 'delete') => {
    Alert.alert(t(`business.${action}Title`), action === 'publish' && campaign.state === 'failed' ? t('business.retryBody') : t(`business.${action}Body`, { count: followerCount }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t(`business.${action}`), style: action === 'delete' ? 'destructive' : 'default', onPress: () => mutation.mutate(action) },
    ]);
  };
  return <View style={businessStyles.section}>
    <View style={businessStyles.row}>
      {campaign.state === 'draft' && <>
        <BusinessButton label={t('business.editDraft')} disabled={mutation.isPending} onPress={() => openCampaignComposer({ workspaceId: campaign.workspaceId, campaignId: campaign.id })} />
        <BusinessButton label={t('business.delete')} disabled={mutation.isPending} onPress={() => confirm('delete')} />
      </>}
      {['draft', 'failed'].includes(campaign.state) && <BusinessButton label={t(campaign.state === 'failed' ? 'business.retryPublish' : 'business.publish')} disabled={mutation.isPending} onPress={() => confirm('publish')} />}
      {['live', 'failed'].includes(campaign.state) && <BusinessButton label={t('business.close')} disabled={mutation.isPending} onPress={() => confirm('close')} />}
      <BusinessButton label={`${t('business.reactions')} / ${t('business.metrics')}`} onPress={() => openCampaignDashboard({ workspaceId: campaign.workspaceId, campaignId: campaign.id })} />
    </View>
    <BusinessError visible={mutation.isError} />
  </View>;
}
export function CampaignCard({ campaign, owner, followerCount = 0, handle = '' }: {
  campaign: BusinessCampaign | PublicCampaign; owner?: boolean; followerCount?: number; handle?: string;
}) {
  const { t } = useTranslation();
  return <View style={businessStyles.card}>
    <CampaignMedia uri={campaign.mediaUrl} mediaType={campaign.mediaType} />
    <Text variant="subtitle">{campaign.title}</Text>
    <Text style={businessStyles.muted}>{t(`business.${campaign.state}`)}</Text>
    {campaign.textOverlay && <Text>{campaign.textOverlay}</Text>}
    {owner && 'counts' in campaign ? <OwnerActions campaign={campaign} followerCount={followerCount} /> :
      <BusinessButton label={campaign.title} onPress={() => openCampaignViewer({ workspaceId: campaign.workspaceId, campaignId: campaign.id, handle })} />}
  </View>;
}
