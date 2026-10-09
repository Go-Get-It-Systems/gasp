import { useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsCard } from '@/components/profile/StatsCard';
import { ActivityCard } from '@/components/profile/ActivityCard';
import { ProductUpdatesEntry } from '@/components/product-updates/ProductUpdatesEntry';
import { QueryState } from '@/components/ui/QueryState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStats, calculateGaspScore } from '@/hooks/queries/useProfile';
import { colors } from '@/constants/colors';
import { BusinessStudioEntry } from '@/components/business/BusinessEntries';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading, isError, refetch } = useProfileStats();

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

      <BusinessStudioEntry />
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
    paddingHorizontal: 20,
    gap: 20,
  },
});
