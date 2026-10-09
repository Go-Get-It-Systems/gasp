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
  const opened = useRef<string | null>(null);
  useEffect(() => {
    const key = `${workspaceId}:${campaignId}`;
    if (!focused || !campaign || !recipient || campaigns.isError || inbox.isError || opened.current === key) return;
    // A failed open must not trigger a mutation/render retry loop. User completion can retry explicitly.
    opened.current = key;
    delivery.mutate('opened');
  }, [focused, campaign, recipient, campaigns.isError, inbox.isError, workspaceId, campaignId, delivery]);
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
