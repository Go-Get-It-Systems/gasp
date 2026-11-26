import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBusinessCampaigns, useBusinessOverview, useBusinessWorkspaces } from '@/hooks/queries/useBusiness';
import { BusinessButton, BusinessQuery, BusinessScreen, businessStyles } from '@/components/business/BusinessUI';
import { Text } from '@/components/ui/Text';
import { CampaignCard } from '@/components/business/CampaignCard';
import { openCampaignComposer, openBusinessProfile } from '@/services/navigation';

function StudioWorkspace({ workspaceId, handle }: { workspaceId: string; handle: string }) {
  const { t } = useTranslation();
  const overview = useBusinessOverview(workspaceId);
  const campaigns = useBusinessCampaigns(workspaceId);
  return <View style={businessStyles.section}>
    <BusinessButton label={t('business.viewProfile')} onPress={() => openBusinessProfile({ handle })} />
    <BusinessQuery query={overview}>{(data) => <View style={businessStyles.card}>
      <Text variant="subtitle">{t('business.overview')}</Text>
      <Text>{t('business.followers')}: {data.followerCount} · {t('business.campaigns')}: {data.campaignCount} · {t('business.published')}: {data.publishedCount}</Text>
    </View>}</BusinessQuery>
    <BusinessButton label={t('business.newCampaign')} onPress={() => openCampaignComposer({ workspaceId })} />
    <Text variant="subtitle">{t('business.campaigns')}</Text>
    <BusinessQuery query={campaigns} empty={t('business.emptyCampaigns')}>{(rows) => rows.map((c) => <CampaignCard key={c.id} campaign={c} owner followerCount={overview.data?.followerCount ?? 0} />)}</BusinessQuery>
  </View>;
}
export default function BusinessStudio() {
  const { t } = useTranslation();
  const query = useBusinessWorkspaces();
  const [selected, setSelected] = useState('');
  const workspace = query.data?.find((w) => w.id === selected) ?? query.data?.[0];
  return <BusinessScreen title={t('business.studio')}>
    <BusinessQuery query={query} empty={t('business.emptyWorkspaces')}>{(rows) => <View style={businessStyles.row}>
      {rows.map((w) => <BusinessButton key={w.id} label={w.displayName} selected={w.id === workspace?.id} onPress={() => setSelected(w.id)} />)}
    </View>}</BusinessQuery>
    {workspace ? <StudioWorkspace key={workspace.id} workspaceId={workspace.id} handle={workspace.handle} /> : <Text style={businessStyles.muted}>{t('business.workspaceHint')}</Text>}
  </BusinessScreen>;
}
