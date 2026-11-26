/** Original public profile layout from origin/feat/business-studio-local. */
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { BusinessWorkspace } from '@/services/api/schemas/business.schema';
import { useBusinessActor, useBusinessProfile, usePublicCampaignReactions, usePublicCampaigns } from '@/hooks/queries/useBusiness';
import { queryKeys } from '@/services/queryKeys';
import { BusinessQuery } from './BusinessUI';
import { BusinessFollowButton } from './BusinessFollowButton';
import { BusinessProfileIdentity } from './BusinessProfileIdentity';
import { BusinessProfileCampaigns } from './BusinessProfileCampaigns';
import { BusinessProfileReactions } from './BusinessProfileReactions';
import { businessProfileStyles as styles } from './businessProfileStyles';

function PublicProfileBody({ workspace, campaignId, refreshProfile }: { workspace: BusinessWorkspace; campaignId?: string; refreshProfile: () => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'reactions'>('campaigns');
  const campaigns = usePublicCampaigns(workspace.id);
  const reactions = usePublicCampaignReactions(workspace.id);
  return <View style={{ flex: 1 }}>
    <BusinessProfileIdentity workspace={workspace} />
    <BusinessFollowButton handle={workspace.handle} workspace={workspace} variant="profile" />
    <View style={styles.tabBar}>{(['campaigns', 'reactions'] as const).map((tab) => <Pressable key={tab}
      style={styles.tabItem} onPress={() => setActiveTab(tab)} accessibilityRole="tab"
      accessibilityLabel={t(`business.${tab}`)} accessibilityState={{ selected: activeTab === tab }}>
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{t(`business.${tab}`)}</Text>
      {activeTab === tab && <View style={styles.tabUnderline} />}
    </Pressable>)}</View>
    {activeTab === 'campaigns' ? <BusinessProfileCampaigns workspaceId={workspace.id} handle={workspace.handle}
      campaignId={campaignId} query={campaigns} refreshProfile={refreshProfile} />
      : <BusinessProfileReactions handle={workspace.handle} query={reactions} campaigns={campaigns.isError ? [] : campaigns.data ?? []}
        following={workspace.isFollowing} refreshProfile={refreshProfile} />}
  </View>;
}

export function BusinessPublicProfileScreen({ handle, campaignId }: { handle: string; campaignId?: string }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const query = useBusinessProfile(handle);
  const actor = useBusinessActor();
  const client = useQueryClient();
  const workspaceId = query.data?.id;
  const refresh = useCallback(() => {
    if (!actor || !handle) return;
    void client.invalidateQueries({ queryKey: queryKeys.business.profile(actor, handle) }).catch((error) => Sentry.captureException(error));
    if (workspaceId) void client.invalidateQueries({ queryKey: queryKeys.business.workspaceAll(actor, workspaceId) }).catch((error) => Sentry.captureException(error));
  }, [actor, handle, client, workspaceId]);
  useFocusEffect(refresh);
  return <View style={[styles.container, { paddingTop: insets.top }]}>
    <View style={styles.topBar}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('business.back')}>
        <ArrowLeft size={22} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{(query.data?.displayName ?? t('business.profile')).toUpperCase()}</Text>
      <View style={styles.backBtn} />
    </View>
    {handle ? <BusinessQuery query={query}>{(workspace) => <PublicProfileBody key={workspace.id} workspace={workspace}
      campaignId={campaignId} refreshProfile={refresh} />}</BusinessQuery>
      : <Text style={styles.emptyBody}>{t('business.unavailable')}</Text>}
  </View>;
}
