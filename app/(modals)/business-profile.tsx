import { Alert, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBusinessProfile, useBusinessWorkspaces, usePublicCampaignReactions, usePublicCampaigns } from '@/hooks/queries/useBusiness';
import { useBusinessFollow } from '@/hooks/queries/useBusinessMutations';
import { BusinessButton, BusinessError, BusinessQuery, BusinessScreen, businessStyles } from '@/components/business/BusinessUI';
import { CampaignCard } from '@/components/business/CampaignCard';
import { ReactionGallery } from '@/components/business/ReactionGallery';
import { Text } from '@/components/ui/Text';
import { openCampaignViewer } from '@/services/navigation';
import type { BusinessWorkspace } from '@/services/api/schemas/business.schema';

function PublicBusiness({ workspace, campaignId }: { workspace: BusinessWorkspace; campaignId: string }) {
  const { t } = useTranslation();
  const own = useBusinessWorkspaces();
  const campaigns = usePublicCampaigns(workspace.id);
  const reactions = usePublicCampaignReactions(workspace.id);
  const pinned = usePublicCampaignReactions(workspace.id, true);
  const follow = useBusinessFollow(workspace.id);
  const isOwner = own.data?.some((w) => w.id === workspace.id);
  const target = campaigns.data?.find((c) => c.id === campaignId);
  function toggleFollow() {
    if (!workspace.isFollowing) { follow.mutate(true); return; }
    Alert.alert(t('business.unfollowTitle'), t('business.unfollowBody'), [
      { text: t('common.cancel'), style: 'cancel' }, { text: t('business.unfollow'), style: 'destructive', onPress: () => follow.mutate(false) },
    ]);
  }
  return <View style={businessStyles.section}>
    <View style={businessStyles.card}>
      {workspace.avatarUrl && <Image source={{ uri: workspace.avatarUrl }} style={{ width: 72, height: 72, borderRadius: 36 }} accessibilityRole="image" accessibilityLabel={workspace.displayName} />}
      <Text variant="subtitle">{workspace.displayName}</Text><Text style={businessStyles.muted}>@{workspace.handle} · {t(workspace.isVerified ? 'business.verified' : 'business.unverified')}</Text>
      {!!workspace.bio && <Text>{workspace.bio}</Text>}<Text>{t('business.followers')}: {workspace.followerCount}</Text>
      {!isOwner && <><Text style={businessStyles.muted}>{t('business.followHint')}</Text><BusinessButton label={t(workspace.isFollowing ? 'business.unfollow' : 'business.follow')} disabled={follow.isPending || own.isLoading || own.isError} onPress={toggleFollow} /></>}
      <BusinessError visible={follow.isError} />
    </View>
    {target && <BusinessButton label={target.title} onPress={() => openCampaignViewer({ workspaceId: workspace.id, campaignId: target.id, handle: workspace.handle })} />}
    <Text variant="subtitle">{t('business.featured')}</Text>
    <BusinessQuery query={pinned} empty={t('business.emptyReactions')}>{(rows) => <ReactionGallery workspaceId={workspace.id} reactions={rows} />}</BusinessQuery>
    <Text variant="subtitle">{t('business.campaigns')}</Text>
    <BusinessQuery query={campaigns} empty={t('business.emptyCampaigns')}>{(rows) => rows.map((c) => <CampaignCard key={c.id} campaign={c} handle={workspace.handle} />)}</BusinessQuery>
    <Text variant="subtitle">{t('business.reactions')}</Text>
    <BusinessQuery query={reactions} empty={t('business.emptyReactions')}>{(rows) => <ReactionGallery workspaceId={workspace.id} reactions={rows} />}</BusinessQuery>
  </View>;
}
export default function BusinessProfile() {
  const { handle = '', campaignId = '' } = useLocalSearchParams<{ handle: string; campaignId?: string }>();
  const { t } = useTranslation();
  const query = useBusinessProfile(handle);
  return <BusinessScreen title={query.data?.displayName ?? t('business.directory')}>
    <BusinessQuery query={query}>{(workspace) => <PublicBusiness workspace={workspace} campaignId={campaignId} />}</BusinessQuery>
  </BusinessScreen>;
}
