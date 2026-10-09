import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBusinessCampaign, useBusinessWorkspaces } from '@/hooks/queries/useBusiness';
import { BusinessQuery, BusinessScreen } from '@/components/business/BusinessUI';
import { CampaignForm } from '@/components/business/CampaignForm';
import { Text } from '@/components/ui/Text';

export default function CampaignComposer() {
  const { workspaceId = '', campaignId = '' } = useLocalSearchParams<{ workspaceId: string; campaignId?: string }>();
  const { t } = useTranslation();
  const workspaces = useBusinessWorkspaces();
  const campaign = useBusinessCampaign(workspaceId, campaignId);
  return <BusinessScreen title={t(campaignId ? 'business.editDraft' : 'business.newCampaign')}>
    <BusinessQuery query={workspaces} empty={t('business.emptyWorkspaces')}>{(rows) => rows.some((w) => w.id === workspaceId) ?
      (campaignId ? <BusinessQuery query={campaign}>{(c) => <CampaignForm key={c.id} workspaceId={workspaceId} campaign={c} />}</BusinessQuery> : <CampaignForm workspaceId={workspaceId} />)
      : <Text>{t('business.workspaceHint')}</Text>}</BusinessQuery>
  </BusinessScreen>;
}
