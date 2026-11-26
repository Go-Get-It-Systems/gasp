import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBusinessCampaign, useBusinessWorkspaces } from '@/hooks/queries/useBusiness';
import { BusinessButton, BusinessQuery, BusinessScreen, businessStyles } from '@/components/business/BusinessUI';
import { CampaignForm } from '@/components/business/CampaignForm';
import { CampaignComposerScreen } from '@/components/business/CampaignComposerScreen';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
import { useBusinessStore } from '@/stores/businessStore';

export default function CampaignComposer() {
  const params = useLocalSearchParams<{ workspaceId?: string; campaignId?: string; mediaUri?: string; isVideo?: string }>();
  const user = useAuthStore((state) => state.user);
  if (user?.accountType !== 'business') return <Redirect href="/(tabs)/profile" />;
  return params.campaignId
    ? <CampaignDraftEditor key={user.id} workspaceId={params.workspaceId ?? ''} campaignId={params.campaignId} />
    : <CampaignComposerScreen key={user.id} workspaceId={params.workspaceId} mediaUri={params.mediaUri} isVideo={params.isVideo} />;
}

function WorkspaceCampaign({ workspaceId, campaignId }: { workspaceId: string; campaignId: string }) {
  const campaign = useBusinessCampaign(workspaceId, campaignId);
  return <BusinessQuery query={campaign}>{(data) =>
    <CampaignForm key={data.id} workspaceId={workspaceId} campaign={data} />
  }</BusinessQuery>;
}

function CampaignDraftEditor({ workspaceId, campaignId }: { workspaceId: string; campaignId: string }) {
  const { t } = useTranslation();
  const workspaces = useBusinessWorkspaces();
  const activeWorkspaceId = useBusinessStore((state) => state.activeWorkspace?.id);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const rows = workspaces.data ?? [];
  // Resolve missing navigation context only from the caller's owner workspaces.
  const workspace = workspaceId
    ? rows.find((row) => row.id === workspaceId)
    : rows.find((row) => row.id === (selectedWorkspaceId || activeWorkspaceId))
      ?? (rows.length === 1 ? rows[0] : undefined);

  return <BusinessScreen title={t('business.editDraft')}>
    <BusinessQuery query={workspaces} empty={t('business.noLinkedBusiness')}>{(owned) => workspace ?
      <WorkspaceCampaign key={`${workspace.id}:${campaignId}`} workspaceId={workspace.id} campaignId={campaignId} />
      : workspaceId ? <Text style={businessStyles.muted}>{t('business.workspaceUnavailable')}</Text>
        : <View style={businessStyles.section}>
          <Text>{t('business.chooseWorkspace')}</Text>
          {owned.map((row) => <BusinessButton key={row.id} label={row.displayName} onPress={() => setSelectedWorkspaceId(row.id)} />)}
        </View>
    }</BusinessQuery>
  </BusinessScreen>;
}
