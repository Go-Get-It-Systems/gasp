import { FlatList, View } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useBusinessDirectory, useBusinessWorkspaces, useCampaignInbox } from '@/hooks/queries/useBusiness';
import { openBusinessStudio, openCampaignViewer, openMyCampaignReactions } from '@/services/navigation';
import { BusinessButton, BusinessQuery, businessStyles } from './BusinessUI';
import { Text } from '@/components/ui/Text';
import { BusinessDiscoverCard } from '@/components/discover/BusinessDiscoverCard';
import { colors } from '@/constants/colors';

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
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 }}>
      <Building2 size={18} color={colors.primaryLight} /><Text style={{ fontSize: 16, fontWeight: '700' }}>{t('business.directory')}</Text>
    </View>
    <BusinessQuery query={query} empty={t('business.emptyDirectory')}>{(rows) => <FlatList
      data={rows} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(row) => row.id}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      renderItem={({ item }) => <BusinessDiscoverCard handle={item.handle} displayName={item.displayName} avatarUrl={item.avatarUrl} workspace={item} />}
    />}</BusinessQuery>
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
