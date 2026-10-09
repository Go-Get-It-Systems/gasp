import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBusinessCampaign, useOwnerCampaignReactions, usePublicCampaignReactions, usePublicCampaigns } from '@/hooks/queries/useBusiness';
import { BusinessQuery, BusinessScreen } from '@/components/business/BusinessUI';
import { CampaignMedia } from '@/components/business/CampaignMedia';
import { Text } from '@/components/ui/Text';

function OwnerReaction({ workspaceId, campaignId, reactionId }: { workspaceId: string; campaignId: string; reactionId: string }) {
  const reactions = useOwnerCampaignReactions(workspaceId, campaignId);
  const campaign = useBusinessCampaign(workspaceId, campaignId);
  const { t } = useTranslation();
  return <BusinessQuery query={reactions}>{(rows) => {
    const reaction = rows.find((r) => r.id === reactionId);
    return reaction ? <>
      {!!campaign.data && <CampaignMedia uri={campaign.data.mediaUrl} mediaType={campaign.data.mediaType} />}
      <CampaignMedia uri={reaction.videoUrl} mediaType="video" />
    </> : <Text>{t('business.unavailable')}</Text>;
  }}</BusinessQuery>;
}
function PublicReaction({ workspaceId, campaignId, reactionId }: { workspaceId: string; campaignId: string; reactionId: string }) {
  const reactions = usePublicCampaignReactions(workspaceId);
  const campaigns = usePublicCampaigns(workspaceId);
  const { t } = useTranslation();
  const campaign = campaigns.data?.find((c) => c.id === campaignId);
  return <BusinessQuery query={reactions}>{(rows) => {
    const reaction = rows.find((r) => r.id === reactionId && r.campaignId === campaignId);
    return reaction ? <>
      {!!campaign && <CampaignMedia uri={campaign.mediaUrl} mediaType={campaign.mediaType} />}
      <CampaignMedia uri={reaction.videoUrl} mediaType="video" />
    </> : <Text>{t('business.unavailable')}</Text>;
  }}</BusinessQuery>;
}
export default function BusinessReaction() {
  const { workspaceId = '', campaignId = '', reactionId = '', owner } = useLocalSearchParams<{ workspaceId: string; campaignId: string; reactionId: string; owner?: string }>();
  const { t } = useTranslation();
  return <BusinessScreen title={t('business.reactions')}>
    {owner === 'true' ? <OwnerReaction workspaceId={workspaceId} campaignId={campaignId} reactionId={reactionId} /> : <PublicReaction workspaceId={workspaceId} campaignId={campaignId} reactionId={reactionId} />}
  </BusinessScreen>;
}
