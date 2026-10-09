import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBusinessDirectory, useBusinessWorkspaces, useCampaignInbox } from '@/hooks/queries/useBusiness';
import { openBusinessStudio, openBusinessProfile, openCampaignViewer, openMyCampaignReactions } from '@/services/navigation';
import { BusinessButton, BusinessQuery, businessStyles } from './BusinessUI';
import { Text } from '@/components/ui/Text';

export function BusinessStudioEntry() {
  const workspaces = useBusinessWorkspaces();
  const { t } = useTranslation();
  return <View style={{ paddingHorizontal: 20, gap: 12 }}>
    {!!workspaces.data?.length && <BusinessButton label={t('business.studio')} onPress={() => openBusinessStudio()} />}
    <BusinessButton label={t('business.myReactions')} onPress={openMyCampaignReactions} />
  </View>;
}
export function BusinessDirectorySection() {
  const query = useBusinessDirectory();
  const { t } = useTranslation();
  // An empty gated pilot does not add an empty section to the personal Discover screen.
  if (query.data?.length === 0) return null;
  return <View style={{ ...businessStyles.section, paddingHorizontal: 20 }}><Text variant="subtitle">{t('business.directory')}</Text>
    <BusinessQuery query={query} empty={t('business.emptyDirectory')}>{(rows) => rows.map((row) =>
      <BusinessButton key={row.id} label={`${row.displayName} · @${row.handle}`} onPress={() => openBusinessProfile({ handle: row.handle })} />
    )}</BusinessQuery>
  </View>;
}
export function CampaignInboxSection() {
  const query = useCampaignInbox();
  const { t } = useTranslation();
  if (query.data?.length === 0) return null;
  return <View style={{ ...businessStyles.section, paddingHorizontal: 20 }}><Text variant="subtitle">{t('business.inbox')}</Text>
    <BusinessQuery query={query} empty={t('business.emptyInbox')}>{(rows) => rows.map((row) =>
      <BusinessButton key={row.id} label={`${row.senderName} · @${row.handle}`} onPress={() => openCampaignViewer({ workspaceId: row.workspaceId, campaignId: row.campaignId, handle: row.handle })} />
    )}</BusinessQuery>
  </View>;
}
