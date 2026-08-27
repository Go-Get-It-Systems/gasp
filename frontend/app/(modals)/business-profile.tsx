/**
 * Business Profile modal — shown to ALL users when they tap a business account.
 *
 * Layout (same for personal and business viewers):
 *   • Identity block: avatar, name, @handle, bio, followers/following, Follow button
 *   • Tabs (underline style): Campaigns | Reactions
 *
 * What differs by viewer type:
 *   • Personal account  : sees campaigns + reactions, Follow button visible
 *   • Business account  : same, plus Follow button (can follow other businesses)
 *   • Own profile       : Follow button hidden
 *
 * No Studio data (delivery stats, metrics) is exposed here — that lives in
 * the owner-only Studio tab.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    BadgeCheck,
    Megaphone,
    Play,
    UserCheck,
    UserPlus,
} from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

import { useUserProfile } from '@/hooks/queries/useUserProfile';
import type { Campaign, CampaignReactionItem } from '@/services/api/business';
import {
    followBusiness,
    getBusinessByHandle,
    getCampaignReactions,
    getFollowStatus,
    getPublicCampaigns,
    unfollowBusiness,
} from '@/services/api/business';
import { useAuthStore } from '@/stores/authStore';
import { businessQueryKeys } from '@/stores/businessStore';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));
  if (h < 1) return 'less than 1h ago';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function stateLabel(state: Campaign['state']): string {
  switch (state) {
    case 'live': return 'LIVE';
    case 'closed': return 'CLOSED';
    default: return state.toUpperCase();
  }
}

function stateColor(state: Campaign['state']): string {
  switch (state) {
    case 'live': return colors.success;
    case 'closed': return colors.textTertiary;
    default: return colors.textSecondary;
  }
}

// ─── Campaign card (public view — no publish button) ─────────────────────────

function CampaignCard({ item }: { item: Campaign }) {
  const color = stateColor(item.state);
  return (
    <View style={campStyles.card}>
      {/* Media preview */}
      {item.mediaUrl ? (
        <View style={campStyles.media}>
          <Image
            source={{ uri: item.mediaUrl }}
            style={StyleSheet.absoluteFillObject as any}
            contentFit="cover"
            transition={200}
          />
          <View style={campStyles.mediaOverlay} />
          <View style={[campStyles.stateBadge, { borderColor: color + '60' }]}>
            <Text style={[campStyles.stateText, { color }]}>{stateLabel(item.state)}</Text>
          </View>
          <View style={campStyles.titleBlock}>
            <Text style={campStyles.campaignTitle} numberOfLines={2}>
              {item.title.toUpperCase()}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[campStyles.media, campStyles.mediaFallback]}>
          <Megaphone size={28} color={colors.textTertiary} />
          <Text style={campStyles.campaignTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      )}
    </View>
  );
}

const campStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  media: {
    height: 180,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  mediaFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  stateBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  stateText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  titleBlock: { padding: 14 },
  campaignTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: 0.3 },
});

// ─── Reaction card ────────────────────────────────────────────────────────────

function ReactionCard({ item }: { item: CampaignReactionItem }) {
  return (
    <View style={rStyles.card}>
      <View style={rStyles.thumb}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject as any} contentFit="cover" transition={200} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surfaceElevated }]} />
        )}
        <View style={rStyles.playIcon}>
          <Play size={14} color="#FFF" fill="#FFF" />
        </View>
      </View>
      <View style={rStyles.info}>
        <View style={rStyles.reactorRow}>
          <View style={rStyles.avatarSmall}>
            {item.reactorAvatarUrl ? (
              <Image source={{ uri: item.reactorAvatarUrl }} style={rStyles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={rStyles.avatarInitials}>{item.reactorDisplayName.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <Text style={rStyles.reactorName} numberOfLines={1}>{item.reactorDisplayName}</Text>
        </View>
        <Text style={rStyles.campaignLabel} numberOfLines={1}>{item.campaignTitle}</Text>
        <Text style={rStyles.time}>{relativeTime(item.createdAt)}</Text>
      </View>
    </View>
  );
}

const rStyles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  thumb: { width: 90, aspectRatio: 9 / 16, backgroundColor: colors.surfaceElevated, position: 'relative' },
  playIcon: { position: 'absolute', bottom: 8, left: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, gap: 4, justifyContent: 'center' },
  reactorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 22, height: 22 },
  avatarInitials: { fontSize: 8, fontWeight: '700', color: colors.textPrimary },
  reactorName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  campaignLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  time: { fontSize: 11, color: colors.textTertiary },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BusinessProfileModal() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'reactions'>('campaigns');

  const { userId, displayName: paramName = '', avatarUrl: paramAvatar = '' } =
    useLocalSearchParams<{ userId: string; displayName?: string; avatarUrl?: string }>();

  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === userId;

  // Profile + workspace
  const { data: profile, isLoading: loadingProfile } = useUserProfile(userId);
  const handle = profile?.username ?? '';

  const { data: workspace, isLoading: loadingWs } = useQuery({
    queryKey: ['businesses', 'handle', handle],
    queryFn: () => getBusinessByHandle(handle),
    enabled: !!handle,
    staleTime: 30_000,
  });

  // Follow state — server query + local optimistic override
  const { data: followStatus } = useQuery({
    queryKey: businessQueryKeys.followStatus(workspace?.id ?? ''),
    queryFn: () => getFollowStatus(workspace!.id),
    enabled: !!workspace?.id && !isOwnProfile,
    staleTime: 60_000,
  });

  // Local optimistic state — null means "use server value"
  const [localFollowing, setLocalFollowing] = useState<boolean | null>(null);
  const isFollowing = localFollowing ?? followStatus?.isFollowing ?? workspace?.isFollowedByViewer ?? false;

  // Public campaigns — lazy: only when tab is active
  const {
    data: campaignsData,
    isLoading: loadingCampaigns,
    isFetching: fetchingCampaigns,
    refetch: refetchCampaigns,
  } = useQuery({
    queryKey: businessQueryKeys.publicCampaigns(workspace?.id ?? ''),
    queryFn: () => getPublicCampaigns(workspace!.id),
    enabled: !!workspace?.id && activeTab === 'campaigns',
    staleTime: 60_000,
  });

  // Reactions — lazy: only when tab is active
  const {
    data: reactionsData,
    isLoading: loadingReactions,
    isFetching: fetchingReactions,
    refetch: refetchReactions,
  } = useQuery({
    queryKey: businessQueryKeys.reactions(workspace?.id ?? ''),
    queryFn: () => getCampaignReactions(workspace!.id),
    enabled: !!workspace?.id && activeTab === 'reactions',
    staleTime: 30_000,
  });

  const workspaceId = workspace?.id ?? '';

  // Follow mutations — optimistic UI: update localFollowing immediately
  const followMutation = useMutation({
    mutationFn: (wsId: string) => followBusiness(wsId),
    onMutate: () => setLocalFollowing(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.followStatus(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ['businesses', 'handle', handle] });
    },
    onError: (e) => {
      setLocalFollowing(false);
      console.error('[follow] error:', e);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (wsId: string) => unfollowBusiness(wsId),
    onMutate: () => setLocalFollowing(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.followStatus(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ['businesses', 'handle', handle] });
    },
    onError: (e) => {
      setLocalFollowing(true);
      console.error('[unfollow] error:', e);
    },
  });

  const isLoading = loadingProfile || (loadingWs && !workspace);

  // Identity
  const name = workspace?.displayName ?? profile?.displayName ?? paramName;
  const avatar = workspace?.avatarUrl ?? profile?.avatarUrl ?? paramAvatar ?? null;
  const bio = profile?.bio ?? null;
  const isVerified = workspace?.isVerified ?? false;
  const followerCount = workspace?.followerCount;
  const followingCount = workspace?.followingCount;

  const activeFetching = activeTab === 'campaigns'
    ? (fetchingCampaigns && !!campaignsData)
    : (fetchingReactions && !!reactionsData);
  const activeRefetch = activeTab === 'campaigns' ? refetchCampaigns : refetchReactions;

  const RING = 80, AV = 70, BADGE = 24;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name ? name.toUpperCase() : 'BUSINESS'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Identity block */}
      {isLoading ? (
        <View style={styles.identitySkeleton}>
          <Skeleton width={RING} height={RING} borderRadius={RING / 2} />
          <View style={{ gap: 6, flex: 1 }}>
            <Skeleton width="60%" height={18} borderRadius={6} />
            <Skeleton width="40%" height={13} borderRadius={5} />
          </View>
        </View>
      ) : (
        <View style={styles.identityBlock}>
          {/* Avatar */}
          <View style={[styles.avatarRing, { width: RING, height: RING, borderRadius: RING / 2 }]}>
            <View style={{ width: AV, height: AV, borderRadius: AV / 2, overflow: 'hidden', backgroundColor: colors.surface }}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={{ width: AV, height: AV }} contentFit="cover" transition={200} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{name.slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
            </View>
            {isVerified && (
              <View style={[styles.verifiedBadge, { width: BADGE, height: BADGE, borderRadius: BADGE / 2 }]}>
                <BadgeCheck size={13} color="#FFF" fill={colors.primary} />
              </View>
            )}
          </View>

          {/* Text info */}
          <View style={styles.identityInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>{name}</Text>
              {isVerified && <BadgeCheck size={16} color={colors.primary} fill={colors.primary} />}
            </View>
            <Text style={styles.handle}>@{handle}</Text>
            {bio ? <Text style={styles.bio} numberOfLines={2}>{bio}</Text> : null}

            {/* Counts */}
            {(followerCount !== undefined || followingCount !== undefined) && (
              <View style={styles.countsRow}>
                {followerCount !== undefined && (
                  <Text style={styles.countText}>
                    <Text style={styles.countValue}>{formatCount(followerCount)}</Text>
                    <Text style={styles.countLabel}> followers</Text>
                  </Text>
                )}
                {followerCount !== undefined && followingCount !== undefined && (
                  <Text style={styles.countDot}> · </Text>
                )}
                {followingCount !== undefined && (
                  <Text style={styles.countText}>
                    <Text style={styles.countValue}>{formatCount(followingCount)}</Text>
                    <Text style={styles.countLabel}> following</Text>
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Follow button — only when workspace is loaded and not own profile */}
      {!isOwnProfile && !!workspaceId && !isLoading && (
        <View style={styles.followRow}>
          <Pressable
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={isFollowing
              ? () => {
                  // Alert.alert does not work on web — use window.confirm as fallback
                  if (typeof window !== 'undefined' && typeof (window as any).confirm === 'function') {
                    const ok = (window as any).confirm(`Stop following ${name}?`);
                    if (ok) unfollowMutation.mutate(workspaceId);
                  } else {
                    Alert.alert(
                      'Unfollow',
                      `Stop following ${name}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Unfollow',
                          style: 'destructive',
                          onPress: () => unfollowMutation.mutate(workspaceId),
                        },
                      ],
                    );
                  }
                }
              : () => followMutation.mutate(workspaceId)
            }
            disabled={followMutation.isPending || unfollowMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
          >
            {isFollowing ? (
              <UserCheck size={16} color={colors.textPrimary} />
            ) : (
              <UserPlus size={16} color="#FFF" />
            )}
            <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Tab bar — underline style */}
      <View style={styles.tabBar}>
        {(['campaigns', 'reactions'] as const).map((t) => (
          <Pressable
            key={t}
            style={styles.tabItem}
            onPress={() => setActiveTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === t }}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'campaigns' ? 'Campaigns' : 'Reactions'}
            </Text>
            {activeTab === t && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      {/* ── CAMPAIGNS ─────────────────────────────────────────────────────── */}
      {activeTab === 'campaigns' && (
        loadingCampaigns ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={campaignsData ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={activeFetching} onRefresh={activeRefetch} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Megaphone size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No campaigns yet</Text>
                <Text style={styles.emptyBody}>This business hasn't published any campaigns yet.</Text>
              </View>
            }
            renderItem={({ item }) => <CampaignCard item={item} />}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )
      )}

      {/* ── REACTIONS ─────────────────────────────────────────────────────── */}
      {activeTab === 'reactions' && (
        loadingReactions ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={reactionsData?.reactions ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={activeFetching} onRefresh={activeRefetch} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No reactions yet</Text>
                <Text style={styles.emptyBody}>
                  {isFollowing
                    ? 'Be the first to react to a campaign!'
                    : 'Follow this business to react to their campaigns.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => <ReactionCard item={item} />}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', letterSpacing: 1.2 },

  // Identity
  identitySkeleton: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 16 },
  identityBlock: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 12 },
  avatarRing: { borderWidth: 3, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', position: 'relative', flexShrink: 0 },
  avatarFallback: { flex: 1, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.background },
  identityInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  displayName: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, flexShrink: 1 },
  handle: { fontSize: 13, color: colors.textSecondary },
  bio: { fontSize: 13, color: colors.textTertiary, lineHeight: 18 },
  countsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  countText: { fontSize: 12 },
  countValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  countLabel: { fontSize: 12, color: colors.textSecondary },
  countDot: { fontSize: 12, color: colors.textTertiary },

  // Follow
  followRow: { paddingHorizontal: 16, paddingBottom: 12 },
  followBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.primary },
  followingBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  followBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  followingBtnText: { color: colors.textPrimary },

  // Tabs
  tabBar: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 4 },
  tabItem: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  tabUnderline: { height: 2, width: '100%', borderRadius: 1, backgroundColor: colors.primary },

  // Lists
  listContent: { paddingHorizontal: 16, paddingTop: 8, gap: 0 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
