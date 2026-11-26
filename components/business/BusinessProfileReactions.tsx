import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { PrivateImage as Image } from '@/components/ui/PrivateImage';
import { Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { PublicCampaign, PublicCampaignReaction } from '@/services/api/schemas/business.schema';
import { usePublicCampaignReactions } from '@/hooks/queries/useBusiness';
import { openPublicCampaignReaction } from '@/services/navigation';
import { BusinessQuery } from './BusinessUI';
import { businessProfileStyles as styles, publicReactionStyles as tile } from './businessProfileStyles';

function PublicReactionTile({ reaction, campaign, handle }: { reaction: PublicCampaignReaction; campaign?: PublicCampaign; handle: string }) {
  const { t, i18n } = useTranslation();
  const thumbnail = reaction.thumbnailUrl || (campaign?.mediaType === 'image' ? campaign.mediaUrl : null);
  return <Pressable style={tile.card} onPress={() => openPublicCampaignReaction({ reaction, campaign, handle })}
    accessibilityRole="button" accessibilityLabel={t('business.viewReaction', { name: reaction.actor.displayName })}>
    <View style={tile.thumb}>
      {thumbnail && <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200}
        accessibilityRole="image" accessibilityLabel={t('business.mediaPreview')} />}
      <View style={tile.playIcon}><Play size={14} color="#FFFFFF" fill="#FFFFFF" /></View>
    </View>
    <View style={tile.info}>
      <View style={tile.reactorRow}><View style={tile.avatarSmall}>
        {reaction.actor.avatarUrl ? <Image source={{ uri: reaction.actor.avatarUrl }} style={tile.avatarImg} contentFit="cover"
          accessibilityRole="image" accessibilityLabel={reaction.actor.displayName} />
          : <Text style={tile.avatarInitials}>{reaction.actor.displayName.slice(0, 2).toUpperCase()}</Text>}
      </View><Text style={tile.reactorName} numberOfLines={1}>{reaction.actor.displayName}</Text></View>
      <Text style={tile.campaignLabel} numberOfLines={1}>{campaign?.title ?? t('business.campaign')}</Text>
      <Text style={tile.time}>{new Date(reaction.createdAt).toLocaleDateString(i18n.language)}</Text>
      <Text style={tile.tapHint}>{t('business.watchSplitScreen')}</Text>
    </View>
  </Pressable>;
}

export function BusinessProfileReactions({ handle, query, campaigns, following, refreshProfile }: {
  handle: string; query: ReturnType<typeof usePublicCampaignReactions>; campaigns: PublicCampaign[]; following: boolean; refreshProfile: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return <BusinessQuery query={{ ...query, data: query.data === undefined ? undefined : { rows: query.data } }}>{() => <FlatList
    style={{ flex: 1 }} data={query.data ?? []} keyExtractor={(item) => item.id}
    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); refreshProfile(); }} tintColor={colors.primary} />}
    ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyTitle}>{t('business.emptyReactions')}</Text>
      <Text style={styles.emptyBody}>{t(following ? 'business.noPublicReactions' : 'business.followForCampaigns')}</Text>
    </View>}
    renderItem={({ item }) => <PublicReactionTile reaction={item} handle={handle} campaign={campaigns.find((row) => row.id === item.campaignId)} />}
    ItemSeparatorComponent={ReactionSeparator}
  />}</BusinessQuery>;
}

function ReactionSeparator() { return <View style={{ height: 10 }} />; }
