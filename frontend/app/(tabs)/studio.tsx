/**
 * Studio tab — business accounts only.
 * Three sub-tabs (underline indicator style):
 *   Overview  : identity, stats, active campaign
 *   Reactions : campaign reaction videos from followers
 *   Metrics   : delivery breakdown + engagement stats (was a separate tab)
 */
import { ActiveCampaignCard } from '@/components/business/ActiveCampaignCard';
import { BusinessStudioHeader } from '@/components/business/BusinessStudioHeader';
import { BusinessStudioProfile } from '@/components/business/BusinessStudioProfile';
import { BusinessStudioStats } from '@/components/business/BusinessStudioStats';
import { FeaturedReactionsGrid } from '@/components/business/FeaturedReactionsGrid';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { CampaignMetric, CampaignReactionItem, MetricsResponse } from '@/services/api/business';
import {
    getCampaignReactions,
    getMetrics,
    getMyBusinesses,
    getStudioOverview,
} from '@/services/api/business';
import { useAuthStore } from '@/stores/authStore';
import { businessQueryKeys, useBusinessStore } from '@/stores/businessStore';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
    BarChart2,
    CheckCircle2,
    Clock,
    Eye,
    Play,
    RefreshCw,
    Send,
    Sparkles,
    TrendingUp,
    XCircle,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabId = 'overview' | 'reactions' | 'metrics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcEngagement(delivered: number, viewed: number): number {
  if (delivered <= 0) return 0;
  return Math.min(100, (viewed / delivered) * 100);
}

function buildCampaignSubtitle(reactions: number, publishedAt: string | null): string {
  const part = `${reactions.toLocaleString('en-US')} reactions`;
  if (!publishedAt) return part;
  const h = Math.floor((Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60));
  return `${part} • live for ${h < 1 ? 'less than 1h' : `${h}h`}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));
  if (h < 1) return 'less than 1h ago';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function stateColor(state: CampaignMetric['state']): string {
  switch (state) {
    case 'live': return colors.success;
    case 'failed': return colors.error;
    case 'publishing': return colors.warning;
    case 'closed': return colors.textTertiary;
    default: return colors.textSecondary;
  }
}

function stateLabel(state: CampaignMetric['state']): string {
  switch (state) {
    case 'live': return 'LIVE';
    case 'failed': return 'FAILED';
    case 'publishing': return 'PUBLISHING';
    case 'closed': return 'CLOSED';
    default: return 'DRAFT';
  }
}

function hasNoRealData(data: MetricsResponse): boolean {
  return data.totalDelivered === 0 && data.totalOpened === 0 && data.totalViewed === 0;
}

// ─── Reaction card ────────────────────────────────────────────────────────────

function ReactionCard({ item }: { item: CampaignReactionItem }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.thumb}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject as any} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surfaceElevated }]} />
        )}
        <View style={cardStyles.playIcon}>
          <Play size={14} color="#FFF" fill="#FFF" />
        </View>
      </View>
      <View style={cardStyles.info}>
        <View style={cardStyles.reactorRow}>
          <View style={cardStyles.avatar}>
            {item.reactorAvatarUrl ? (
              <Image source={{ uri: item.reactorAvatarUrl }} style={{ width: 22, height: 22 }} contentFit="cover" />
            ) : (
              <Text style={cardStyles.avatarInitials}>{item.reactorDisplayName.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <Text style={cardStyles.reactorName} numberOfLines={1}>{item.reactorDisplayName}</Text>
        </View>
        <Text style={cardStyles.campaignLabel} numberOfLines={1}>{item.campaignTitle}</Text>
        <Text style={cardStyles.time}>{relativeTime(item.createdAt)}</Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  thumb: { width: 90, aspectRatio: 9 / 16, backgroundColor: colors.surfaceElevated, position: 'relative' },
  playIcon: { position: 'absolute', bottom: 8, left: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, gap: 4, justifyContent: 'center' },
  reactorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarInitials: { fontSize: 8, fontWeight: '700', color: colors.textPrimary },
  reactorName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  campaignLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  time: { fontSize: 11, color: colors.textTertiary },
});

// ─── Metrics sub-components ───────────────────────────────────────────────────

function SkeletonBlock({ width = '100%', height = 16, borderRadius = 8 }: { width?: number | string; height?: number; borderRadius?: number }) {
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.35, { duration: 700 })), -1, false);
  }, [opacity]);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[animStyle, { width: width as number, height, borderRadius, backgroundColor: colors.surfaceElevated }]} />;
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <View style={mStyles.summaryCard}>
      <View style={mStyles.iconWrap}>{icon}</View>
      <Text style={[mStyles.summaryValue, color ? { color } : {}]}>{value}</Text>
      <Text style={mStyles.summaryLabel}>{label}</Text>
    </View>
  );
}

function PlaceholderSummaryCard({ label }: { label: string }) {
  return (
    <View style={mStyles.summaryCard}>
      <SkeletonBlock width={28} height={28} borderRadius={14} />
      <SkeletonBlock width={48} height={22} borderRadius={6} />
      <Text style={mStyles.summaryLabel}>{label}</Text>
    </View>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={mStyles.pill}>
      {icon}
      <Text style={mStyles.pillValue}>{value}</Text>
      <Text style={mStyles.pillLabel}>{label}</Text>
    </View>
  );
}

function CampaignMetricRow({ item }: { item: CampaignMetric }) {
  const color = stateColor(item.state);
  return (
    <View style={mStyles.campaignCard}>
      <View style={mStyles.campaignHeader}>
        <Text style={mStyles.campaignTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[mStyles.stateBadge, { borderColor: color }]}>
          <Text style={[mStyles.stateBadgeText, { color }]}>{stateLabel(item.state)}</Text>
        </View>
      </View>
      <Text style={mStyles.campaignTime}>{relativeTime(item.publishedAt)}</Text>
      <View style={mStyles.pillsRow}>
        <StatPill icon={<Send size={11} color={colors.primary} />} label="Delivered" value={formatCount(item.delivered)} />
        <StatPill icon={<Eye size={11} color={colors.accentCyan} />} label="Opened" value={formatCount(item.opened)} />
        <StatPill icon={<TrendingUp size={11} color={colors.success} />} label="Eng." value={`${item.engagementRate}%`} />
        <StatPill icon={<XCircle size={11} color={colors.error} />} label="Failed" value={formatCount(item.failed)} />
      </View>
      {item.queued > 0 && (
        <View style={mStyles.barWrap}>
          <View style={mStyles.barTrack}>
            <View style={[mStyles.barFill, { width: `${Math.min(item.deliveryRate, 100)}%` as any }]} />
          </View>
          <Text style={mStyles.barLabel}>{item.deliveryRate}% delivered</Text>
        </View>
      )}
    </View>
  );
}

const mStyles = StyleSheet.create({
  summaryCard: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous', paddingVertical: 16, gap: 4, borderWidth: 1, borderColor: colors.border },
  iconWrap: { marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  pill: { flex: 1, alignItems: 'center', gap: 2 },
  pillValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  pillLabel: { fontSize: 10, color: colors.textTertiary, fontWeight: '500' },
  campaignCard: { backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  campaignHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  campaignTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  stateBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  stateBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  campaignTime: { fontSize: 12, color: colors.textTertiary, marginTop: -4 },
  pillsRow: { flexDirection: 'row', gap: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border },
  barWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },
  barLabel: { fontSize: 11, color: colors.textTertiary, fontWeight: '600', minWidth: 80, textAlign: 'right' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StudioScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { activeWorkspace, setActiveWorkspace } = useBusinessStore();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Load workspace
  const { data: myBusinesses, isLoading: loadingWs } = useQuery({
    queryKey: businessQueryKeys.mine(),
    queryFn: async () => {
      const ws = await getMyBusinesses();
      const active = ws.find((w) => w.isActive) ?? ws[0] ?? null;
      if (active) setActiveWorkspace(active);
      return ws;
    },
    retry: false,
    staleTime: 60_000,
  });

  const workspace = myBusinesses?.find((w) => w.isActive) ?? myBusinesses?.[0] ?? null;
  const workspaceId = workspace?.id;

  // Overview — always eager
  const { data, isLoading: loadingOverview, isFetching, refetch } = useQuery({
    queryKey: businessQueryKeys.overview(workspaceId ?? ''),
    queryFn: () => { if (!workspaceId) throw new Error('No workspace'); return getStudioOverview(workspaceId); },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  // Reactions — lazy
  const { data: reactionsData, isLoading: loadingReactions, isFetching: fetchingReactions, refetch: refetchReactions } = useQuery({
    queryKey: businessQueryKeys.reactions(workspaceId ?? ''),
    queryFn: () => { if (!workspaceId) throw new Error('No workspace'); return getCampaignReactions(workspaceId); },
    enabled: !!workspaceId && activeTab === 'reactions',
    staleTime: 30_000,
  });

  // Metrics — lazy, uses same workspace resolution pattern as old metrics screen
  const resolvedId = activeWorkspace?.id ?? workspaceId;
  const { data: metricsData, isLoading: loadingMetrics, isError: metricsError, isFetching: fetchingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: businessQueryKeys.metrics(resolvedId ?? ''),
    queryFn: () => { if (!resolvedId) throw new Error('No workspace'); return getMetrics(resolvedId); },
    enabled: !!resolvedId && activeTab === 'metrics',
    staleTime: 60_000,
  });

  const isLoading = loadingWs || (loadingOverview && !data);
  const isPlaceholder = !!metricsData && hasNoRealData(metricsData);

  const counts = data?.deliveryCounts;
  const campaign = data?.latestCampaign ?? null;
  const reactions = counts?.opened ?? 0;
  const opens = counts?.delivered ?? 0;
  const engagement = counts ? calcEngagement(counts.delivered, counts.viewed) : 0;
  const campaignSubtitle = campaign ? buildCampaignSubtitle(reactions, campaign.publishedAt) : '';

  const ws = data?.workspace ?? workspace;
  const displayName = ws?.displayName ?? user?.displayName ?? '';
  const handle = ws?.handle ?? user?.username ?? '';
  const avatarUrl = ws?.avatarUrl ?? user?.avatarUrl ?? null;
  const isVerified = ws?.isVerified ?? false;

  // ─── Tab label helper ──────────────────────────────────────────────────────

  function TabLabel({ id, label }: { id: TabId; label: string }) {
    const isActive = activeTab === id;
    return (
      <Pressable
        style={styles.tabItem}
        onPress={() => setActiveTab(id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
        {isActive && <View style={styles.tabUnderline} />}
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header — no back arrow since Studio is a root tab */}
      <BusinessStudioHeader
        title={`${displayName || 'Business'} Studio`}
        showBack={false}
        onSettingsPress={() => router.push('/(modals)/settings')}
      />

      {/* Sub-tab bar */}
      <View style={styles.tabBar}>
        <TabLabel id="overview" label="Overview" />
        <TabLabel id="reactions" label="Reactions" />
        <TabLabel id="metrics" label="Metrics" />
      </View>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !!data} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {isLoading ? (
            <View style={styles.skeletonContainer}>
              <Skeleton width="100%" height={88} borderRadius={16} />
              <Skeleton width="100%" height={72} borderRadius={16} />
              <Skeleton width="100%" height={200} borderRadius={18} />
              <Skeleton width="100%" height={160} borderRadius={16} />
            </View>
          ) : (
            <>
              <BusinessStudioProfile
                displayName={displayName}
                handle={handle}
                avatarUrl={avatarUrl}
                isVerified={isVerified}
                followerCount={ws?.followerCount}
                followingCount={ws?.followingCount}
                onCreateGasp={() => router.push('/(business)/campaigns')}
              />
              <BusinessStudioStats reactions={reactions} opens={opens} engagementRate={engagement} />
              {campaign && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {campaign.state === 'live' ? 'Active campaign' : 'Latest campaign'}
                  </Text>
                  <ActiveCampaignCard
                    title={campaign.title}
                    subtitle={campaignSubtitle}
                    mediaUrl={campaign.mediaUrl}
                    onPress={() => router.push('/(business)/campaigns')}
                  />
                </View>
              )}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured reactions</Text>
                <FeaturedReactionsGrid reactions={[]} />
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ── REACTIONS ───────────────────────────────────────────────────── */}
      {activeTab === 'reactions' && (
        loadingReactions ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={reactionsData?.reactions ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.reactionsList, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={fetchingReactions && !!reactionsData} onRefresh={refetchReactions} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No reactions yet</Text>
                <Text style={styles.emptyBody}>Followers will react to your campaigns here.</Text>
              </View>
            }
            renderItem={({ item }) => <ReactionCard item={item} />}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )
      )}

      {/* ── METRICS ─────────────────────────────────────────────────────── */}
      {activeTab === 'metrics' && (
        loadingMetrics ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : metricsError ? (
          <View style={styles.centerState}>
            <Text style={styles.errorText}>Could not load metrics.</Text>
            <Pressable onPress={() => refetchMetrics()} style={styles.retryBtn}>
              <RefreshCw size={15} color={colors.primary} />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : metricsData ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.metricsContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={fetchingMetrics && !!metricsData} onRefresh={refetchMetrics} tintColor={colors.primary} />}
          >
            {isPlaceholder && (
              <View style={styles.placeholderBanner}>
                <Sparkles size={16} color={colors.primary} />
                <Text style={styles.placeholderBannerText}>
                  Publish your first campaign to see real metrics here.
                </Text>
              </View>
            )}

            {/* Summary row 1 */}
            <View style={styles.summaryRow}>
              {isPlaceholder ? (
                <>
                  <PlaceholderSummaryCard label="Delivered" />
                  <PlaceholderSummaryCard label="Opened" />
                  <PlaceholderSummaryCard label="Avg. Eng." />
                </>
              ) : (
                <>
                  <SummaryCard icon={<CheckCircle2 size={18} color={colors.success} />} label="Delivered" value={formatCount(metricsData.totalDelivered)} color={colors.success} />
                  <SummaryCard icon={<Eye size={18} color={colors.accentCyan} />} label="Opened" value={formatCount(metricsData.totalOpened)} color={colors.accentCyan} />
                  <SummaryCard icon={<TrendingUp size={18} color={colors.primary} />} label="Avg. Eng." value={`${metricsData.avgEngagementRate}%`} color={colors.primary} />
                </>
              )}
            </View>

            {/* Summary row 2 */}
            <View style={styles.summaryRow}>
              {isPlaceholder ? (
                <>
                  <PlaceholderSummaryCard label="Viewed" />
                  <PlaceholderSummaryCard label="Campaigns" />
                </>
              ) : (
                <>
                  <SummaryCard icon={<Eye size={18} color={colors.primaryLight} />} label="Viewed" value={formatCount(metricsData.totalViewed)} color={colors.primaryLight} />
                  <SummaryCard icon={<Clock size={18} color={colors.textSecondary} />} label="Campaigns" value={metricsData.totalCampaigns.toString()} />
                </>
              )}
            </View>

            <Text style={styles.metricsSectionTitle}>Campaigns</Text>

            {metricsData.campaigns.length === 0 && (
              <View style={styles.emptyState}>
                <BarChart2 size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No campaigns yet</Text>
                <Text style={styles.emptyBody}>Publish a campaign to see delivery and engagement metrics.</Text>
                <Pressable style={styles.emptyBtn} onPress={() => router.push('/(business)/campaigns')}>
                  <Text style={styles.emptyBtnText}>Create campaign</Text>
                </Pressable>
              </View>
            )}

            {metricsData.campaigns.length > 0 && isPlaceholder && (
              <View style={styles.campaignList}>
                {metricsData.campaigns.map((item) => (
                  <View key={item.campaignId} style={mStyles.campaignCard}>
                    <View style={mStyles.campaignHeader}>
                      <SkeletonBlock width="60%" height={14} borderRadius={6} />
                      <SkeletonBlock width={60} height={20} borderRadius={6} />
                    </View>
                    <SkeletonBlock width="30%" height={11} borderRadius={4} />
                    <View style={[mStyles.pillsRow, { gap: 8 }]}>
                      <SkeletonBlock width="22%" height={36} borderRadius={8} />
                      <SkeletonBlock width="22%" height={36} borderRadius={8} />
                      <SkeletonBlock width="22%" height={36} borderRadius={8} />
                      <SkeletonBlock width="22%" height={36} borderRadius={8} />
                    </View>
                    <SkeletonBlock width="100%" height={4} borderRadius={2} />
                  </View>
                ))}
              </View>
            )}

            {metricsData.campaigns.length > 0 && !isPlaceholder && (
              <View style={styles.campaignList}>
                {metricsData.campaigns.map((item) => (
                  <CampaignMetricRow key={item.campaignId} item={item} />
                ))}
              </View>
            )}
          </ScrollView>
        ) : null
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Tab bar ────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 6,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  tabUnderline: { height: 2, width: '100%', borderRadius: 1, backgroundColor: colors.primary },

  // ── Overview ───────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { gap: 20, paddingTop: 4 },
  skeletonContainer: { paddingHorizontal: 16, gap: 16 },
  section: { gap: 12, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },

  // ── Reactions ──────────────────────────────────────────────────────────────
  reactionsList: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Metrics ────────────────────────────────────────────────────────────────
  metricsContent: { paddingHorizontal: 16, gap: 16, paddingTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  metricsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -4,
  },
  campaignList: { gap: 12 },
  placeholderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  placeholderBannerText: { flex: 1, fontSize: 13, color: colors.primaryLight, fontWeight: '500', lineHeight: 18 },

  // ── Shared states ──────────────────────────────────────────────────────────
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 24 },
  errorText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  retryText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, height: 44, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
