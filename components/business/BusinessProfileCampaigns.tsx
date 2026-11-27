import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { PrivateImage as Image } from '@/components/ui/PrivateImage';
import { Megaphone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { PublicCampaign } from '@/services/api/schemas/business.schema';
import { usePublicCampaigns } from '@/hooks/queries/useBusiness';
import { openCampaignViewer } from '@/services/navigation';
import { BusinessQuery } from './BusinessUI';
import { BusinessProfileFeatured } from './BusinessProfileFeatured';
import { CampaignVideoCover } from './CampaignVideoCover';
import { businessProfileStyles as styles, publicCampaignStyles as tile } from './businessProfileStyles';

function PublicCampaignTile({ campaign, handle }: { campaign: PublicCampaign; handle: string }) {
  const { t } = useTranslation();
  const color = campaign.state === 'live' ? colors.success : colors.textSecondary;
  return <Pressable style={tile.card} onPress={() => openCampaignViewer({ workspaceId: campaign.workspaceId, campaignId: campaign.id, handle })}
    accessibilityRole="button" accessibilityLabel={`${t('business.viewCampaign')}: ${campaign.title}`}>
    <View style={tile.media}>
      {campaign.mediaType === 'image' ? <Image source={{ uri: campaign.mediaUrl }} style={StyleSheet.absoluteFill}
        contentFit="cover" transition={200} accessibilityRole="image" accessibilityLabel={campaign.title} />
        : <CampaignVideoCover uri={campaign.mediaUrl} />}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} locations={[0.2, 1]}
        style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[tile.stateBadge, { borderColor: color + '60' }]}><Text style={[tile.stateText, { color }]}>{t(`business.${campaign.state}`).toUpperCase()}</Text></View>
      <View style={tile.titleBlock}><Text style={tile.campaignTitle} numberOfLines={2}>{campaign.title}</Text></View>
    </View>
  </Pressable>;
}

export function BusinessProfileCampaigns({ workspaceId, handle, campaignId, query, refreshProfile }: {
  workspaceId: string; handle: string; campaignId?: string; query: ReturnType<typeof usePublicCampaigns>; refreshProfile: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Preserve the campaign context of notification links in the public grid.
  const target = query.data?.find((row) => row.id === campaignId);
  const rows = target ? [target, ...(query.data ?? []).filter((row) => row.id !== target.id)] : query.data ?? [];
  return <BusinessQuery query={{ ...query, data: query.data === undefined ? undefined : { rows } }}>{() => <FlatList
    style={{ flex: 1 }} data={rows} keyExtractor={(item) => item.id} numColumns={2} columnWrapperStyle={{ gap: 8 }}
    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); refreshProfile(); }} tintColor={colors.primary} />}
    ListEmptyComponent={<View style={styles.emptyState}><Megaphone size={40} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{t('business.emptyCampaigns')}</Text><Text style={styles.emptyBody}>{t('business.noPublicCampaigns')}</Text>
    </View>}
    renderItem={({ item }) => <View style={{ flex: 1 }}><PublicCampaignTile campaign={item} handle={handle} /></View>}
    ItemSeparatorComponent={CampaignSeparator}
    ListFooterComponent={<BusinessProfileFeatured workspaceId={workspaceId} handle={handle} campaigns={query.isError ? [] : rows} />}
  />}</BusinessQuery>;
}

function CampaignSeparator() { return <View style={{ height: 8 }} />; }
