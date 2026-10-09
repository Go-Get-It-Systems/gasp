import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCampaignInbox, usePublicCampaigns } from '@/hooks/queries/useBusiness';
import { useCampaignDelivery } from '@/hooks/queries/useBusinessMutations';
import { BusinessButton, BusinessError, BusinessQuery, BusinessScreen, businessStyles } from '@/components/business/BusinessUI';
import { CampaignMedia } from '@/components/business/CampaignMedia';
import { Text } from '@/components/ui/Text';
import { openCampaignReactionComposer } from '@/services/navigation';

export default function CampaignViewer() {
  const { workspaceId = '', campaignId = '' } = useLocalSearchParams<{ workspaceId: string; campaignId: string; handle?: string }>();
  const { t } = useTranslation();
  const focused = useIsFocused();
  const campaigns = usePublicCampaigns(workspaceId);
  const inbox = useCampaignInbox();
  const delivery = useCampaignDelivery(workspaceId, campaignId);
  const campaign = campaigns.data?.find((c) => c.id === campaignId);
  const recipient = inbox.data?.some((item) => item.workspaceId === workspaceId && item.campaignId === campaignId);
  const opened = useRef(false);
  useEffect(() => {
    if (!focused || !campaign || !recipient || opened.current) return;
    opened.current = true;
    delivery.mutate('opened', { onError: () => { opened.current = false; } });
  }, [focused, campaign, recipient, delivery]);
  return <BusinessScreen title={campaign?.title ?? t('business.campaigns')}>
    <BusinessQuery query={campaigns} empty={t('business.unavailable')}>{() => campaign ? <>
      <CampaignMedia uri={campaign.mediaUrl} mediaType={campaign.mediaType} />
      {!!campaign.textOverlay && <Text>{campaign.textOverlay}</Text>}
      {recipient ? <>
        <BusinessButton label={t('business.finishViewing')} disabled={delivery.isPending} onPress={() => delivery.mutate('viewed', {
          onSuccess: () => openCampaignReactionComposer({ workspaceId, campaignId }),
        })} />
        <BusinessError visible={delivery.isError} />
      </> : <Text style={businessStyles.muted}>{t('business.previewOnly')}</Text>}
    </> : <Text>{t('business.unavailable')}</Text>}</BusinessQuery>
  </BusinessScreen>;
}
