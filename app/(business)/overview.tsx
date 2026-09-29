import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ActiveCampaignCard } from '@/components/business/ActiveCampaignCard';
import { BusinessStudioHeader } from '@/components/business/BusinessStudioHeader';
import { BusinessStudioProfile } from '@/components/business/BusinessStudioProfile';
import { BusinessStudioStats } from '@/components/business/BusinessStudioStats';
import { FeaturedReactionsGrid } from '@/components/business/FeaturedReactionsGrid';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { getStudioOverview } from '@/services/api/business';
import { businessQueryKeys, useBusinessStore } from '@/stores/businessStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Derives an engagement-rate percentage from aggregate delivery counts.
 * Formula: viewed / max(delivered, 1) × 100
 */
function calcEngagement(delivered: number, viewed: number): number {
  if (delivered <= 0) return 0;
  return Math.min(100, (viewed / delivered) * 100);
}

/**
 * Builds a human-readable campaign subtitle from delivery counts and
 * the campaign's published timestamp.
 */
function buildCampaignSubtitle(
  reactions: number,
  publishedAt: string | null,
): string {
  const reactionPart = `${reactions.toLocaleString('en-US')} reactions`;
  if (!publishedAt) return reactionPart;

  const diffMs = Date.now() - new Date(publishedAt).getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const timePart = diffH < 1 ? 'less than 1h ago' : `live for ${diffH}h`;
  return `${reactionPart} • ${timePart}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────

export default function StudioOverviewScreen() {
  const insets = useSafeAreaInsets();
  const { activeWorkspace, exitStudio } = useBusinessStore();

  // R5.3 — query key must include workspaceId; fail immediately if absent
  const workspaceId = activeWorkspace?.id;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: businessQueryKeys.overview(workspaceId ?? ''),
    queryFn: () => {
      if (!workspaceId) throw new Error('No active workspace');
      return getStudioOverview(workspaceId);
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const handleExit = () => {
    exitStudio();
    router.replace('/(tabs)/profile');
  };

  const handleCreateGasp = () => {
    router.push('/(business)/campaigns');
  };

  const handleViewProfile = () => {
    const handle = data?.workspace.handle ?? activeWorkspace?.handle;
    if (handle) {
      router.push(`/business/${handle}` as any);
    }
  };

  // ── Derived values from data ──────────────────────────────────────────
  const workspace = data?.workspace ?? activeWorkspace;
  const campaign = data?.latestCampaign ?? null;
  const counts = data?.deliveryCounts;

  const reactions = counts?.opened ?? 0;
  const opens = counts?.delivered ?? 0;
  const engagement = counts
    ? calcEngagement(counts.delivered, counts.viewed)
    : 0;

  const campaignSubtitle = campaign
    ? buildCampaignSubtitle(reactions, campaign.publishedAt)
    : '';

  // ── Featured reactions placeholder thumbnails ──────────────────────────
  // When the backend serves real reaction thumbnails this array will come
  // from a dedicated query. For now we surface an empty array and let the
  // grid show placeholder cells.
  const featuredReactions: { id: string; thumbnailUrl: string }[] = [];

  // ── Loading state (initial load only) ────────────────────────────────
  if (isLoading && !data) {
    return (
      <View style={styles.fullScreen}>
        <BusinessStudioHeader
          title={`${activeWorkspace?.displayName ?? 'Business'} Studio`}
          onSettingsPress={() => router.push('/(business)/workspace')}
        />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (isError && !data) {
    return (
      <View style={styles.fullScreen}>
        <BusinessStudioHeader
          title={`${activeWorkspace?.displayName ?? 'Business'} Studio`}
          onSettingsPress={() => router.push('/(business)/workspace')}
        />
        <View style={styles.loadingCenter}>
          <Text style={styles.errorText}>{'Could not load data.'}</Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <RefreshCw size={16} color={colors.primary} />
            <Text style={styles.retryText}>{'Try again'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <View style={styles.fullScreen}>
      {/* Fixed header — not scrollable */}
      <BusinessStudioHeader
        title={`${workspace?.displayName ?? 'Business'} Studio`}
        onSettingsPress={() => router.push('/(business)/workspace')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !!data}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Profile identity block ─────────────────────────────── */}
        <BusinessStudioProfile
          displayName={workspace?.displayName ?? ''}
          handle={workspace?.handle ?? ''}
          avatarUrl={workspace?.avatarUrl ?? null}
          isVerified={workspace?.isVerified ?? false}
          onCreateGasp={handleCreateGasp}
        />

        {/* ── Aggregate stats row ────────────────────────────────── */}
        <BusinessStudioStats
          reactions={reactions}
          opens={opens}
          engagementRate={engagement}
        />

        {/* ── Active / latest campaign ───────────────────────────── */}
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

        {/* ── Featured reactions grid ────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'Featured reactions'}</Text>
          <FeaturedReactionsGrid
            reactions={featuredReactions}
            onReactionPress={(id) => {
              // future: open reaction viewer
            }}
          />
        </View>

        {/* ── Quick nav row ──────────────────────────────────────── */}
        <View style={styles.navRow}>
          <Pressable
            style={styles.navPill}
            onPress={() => router.push('/(business)/campaigns')}
            accessibilityRole="button"
          >
            <Text style={styles.navPillText}>{'View campaigns'}</Text>
          </Pressable>

          <Pressable
            style={styles.navPill}
            onPress={handleExit}
            accessibilityRole="button"
            accessibilityLabel="Exit Business Studio"
          >
            <Text style={styles.navPillText}>{'Exit Studio'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 20,
  },
  // ── States ──────────────────────────────────────────────────────────
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  // ── Content ─────────────────────────────────────────────────────────
  section: {
    gap: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  // ── Nav row ─────────────────────────────────────────────────────────
  navRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  navPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
