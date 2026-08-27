import { ProductUpdatesEntry } from '@/components/product-updates/ProductUpdatesEntry';
import { ActivityCard } from '@/components/profile/ActivityCard';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsCard } from '@/components/profile/StatsCard';
import { QueryState } from '@/components/ui/QueryState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { calculateGaspScore, useProfileStats } from '@/hooks/queries/useProfile';
import { getMyBusinesses } from '@/services/api/business';
import { useAuthStore } from '@/stores/authStore';
import { businessQueryKeys, useBusinessStore } from '@/stores/businessStore';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { setActiveWorkspace } = useBusinessStore();
  const { data: stats, isLoading, isError, refetch } = useProfileStats();

  // Business accounts live in the Studio tab — profile is personal-only.
  // If somehow a business account lands here, redirect immediately.
  // (Normally the tab bar hides chat and shows studio/metrics instead.)

  // ── Personal-user Studio entry ────────────────────────────────────────
  const { data: myBusinesses } = useQuery({
    queryKey: businessQueryKeys.mine(),
    queryFn: getMyBusinesses,
    retry: false,
    staleTime: 60_000,
    // Only run for personal users who may also own a workspace
    enabled: user?.accountType !== 'business',
  });

  const hasActiveOwnership =
    Array.isArray(myBusinesses) &&
    myBusinesses.some((w) => w.isActive);

  const handleEnterStudio = () => {
    const workspace = myBusinesses?.find((w) => w.isActive) ?? myBusinesses?.[0];
    if (workspace) setActiveWorkspace(workspace);
    router.push('/(business)/overview');
  };

  const gaspScore = calculateGaspScore(
    stats?.gaspsSent ?? 0,
    stats?.gaspsReceived ?? 0,
    stats?.streak ?? 0,
    stats?.reactionsReceived ?? 0,
  );

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);
  const openProductUpdates = useCallback(() => {
    router.push('/(modals)/product-updates');
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 100,
        gap: 20,
      }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <ProfileHeader
        displayName={user?.displayName ?? 'Guest'}
        username={user?.username ?? 'guest'}
        avatarUri={user?.avatarUrl ?? null}
        gaspScore={gaspScore}
        onSettingsPress={() => router.push('/(modals)/settings')}
        onEditProfilePress={() => router.push('/(modals)/edit-profile')}
      />

      <QueryState
        data={stats}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        isEmpty={() => false}
        skeleton={
          <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={90} borderRadius={16} />
            <Skeleton width="100%" height={130} borderRadius={16} />
          </View>
        }
      >
        {(s) => (
          <>
            <StatsCard
              gaspsSent={s.gaspsSent}
              gaspsReceived={s.gaspsReceived}
              friendsCount={s.friendsCount}
            />
            <ActivityCard
              streak={s.streak ?? 0}
              reactionsReceived={s.reactionsReceived ?? 0}
              memberSince={user?.createdAt ?? ''}
            />

            {/* Business Studio entry — only shown to personal users who also own a workspace */}
            {hasActiveOwnership && (
              <Pressable onPress={handleEnterStudio} style={styles.studioEntry}>
                <View style={styles.studioIcon}>
                  <Text style={styles.studioIconEmoji}>🏢</Text>
                </View>
                <View style={styles.studioInfo}>
                  <Text style={styles.studioTitle}>Business Studio</Text>
                  <Text style={styles.studioSubtitle}>
                    {myBusinesses?.[0]?.displayName ?? 'Manage workspace'}
                  </Text>
                </View>
              </Pressable>
            )}

            <ProductUpdatesEntry
              userId={user?.id}
              onPress={openProductUpdates}
            />
          </>
        )}
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  studioEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  studioIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studioIconEmoji: { fontSize: 22 },
  studioInfo: { flex: 1, gap: 2 },
  studioTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  studioSubtitle: { fontSize: 13, color: colors.textSecondary },
});
