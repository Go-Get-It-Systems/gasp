import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { Clock3, Send } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FriendRequestSection } from '@/components/inbox/FriendRequestSection';
import { GaspsPulseHeader } from '@/components/inbox/GaspsPulseHeader';
import { LatestMomentCard } from '@/components/inbox/LatestMomentCard';
import { OpenNowRail } from '@/components/inbox/OpenNowRail';
import { ReactionReturnSection } from '@/components/inbox/ReactionReturnSection';
import { SectionHeader } from '@/components/inbox/SectionHeader';
import { SentGaspItem } from '@/components/inbox/SentGaspItem';
import { colors } from '@/constants/colors';
import {
  useAcceptFriendRequest,
  usePendingFriendRequests,
  useRejectFriendRequest,
} from '@/hooks/queries/useFriends';
import { useLatestMoment, usePendingGasps, useSentGasps } from '@/hooks/queries/useGasps';
import { useReceivedReactions } from '@/hooks/queries/useReactions';
import type { Gasp } from '@/services/api/schemas/gasp.schema';
import { openGaspViewer } from '@/services/navigation';
import { SOCIAL_PULSE_SECTION_ORDER, sortOpenNow, type SocialPulseSection } from '@/services/socialPulse';

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [preloadingId, setPreloadingId] = useState<string | null>(null);

  const requestsQuery = usePendingFriendRequests();
  const pendingQuery = usePendingGasps();
  const sentQuery = useSentGasps();
  const latestQuery = useLatestMoment();
  const reactionsQuery = useReceivedReactions();
  const acceptMutation = useAcceptFriendRequest();
  const rejectMutation = useRejectFriendRequest();

  const friendRequests = requestsQuery.data ?? [];
  const pendingGasps = useMemo(() => sortOpenNow(pendingQuery.data ?? []), [pendingQuery.data]);
  const sentGasps = useMemo(() => (sentQuery.data ?? []).filter((gasp) => !gasp.momentId), [sentQuery.data]);
  const reactionReturns = reactionsQuery.data ?? [];
  const sections = SOCIAL_PULSE_SECTION_ORDER;

  const openCamera = useCallback(() => router.push('/(tabs)/camera'), []);
  const handleAccept = useCallback((friendshipId: string) => {
    if (processingId) return;
    setProcessingId(friendshipId);
    acceptMutation.mutate(friendshipId, { onSettled: () => setProcessingId(null) });
  }, [acceptMutation, processingId]);
  const handleReject = useCallback((friendshipId: string) => {
    if (processingId) return;
    setProcessingId(friendshipId);
    rejectMutation.mutate(friendshipId, { onSettled: () => setProcessingId(null) });
  }, [processingId, rejectMutation]);

  const handleOpenGasp = useCallback(async (gasp: Gasp) => {
    if (preloadingId) return;
    setPreloadingId(gasp.id);
    try {
      await openGaspViewer({
        imageUri: gasp.imageUri,
        senderName: gasp.senderName,
        mediaType: gasp.mediaType,
        blurhash: gasp.blurhash,
        textOverlay: gasp.textOverlay,
        gaspId: gasp.id,
      });
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      setPreloadingId(null);
    }
  }, [preloadingId]);

  const handleRefresh = useCallback(() => {
    void Promise.all([
      pendingQuery.refetch(),
      latestQuery.refetch(),
      reactionsQuery.refetch(),
      requestsQuery.refetch(),
      sentQuery.refetch(),
    ]);
  }, [latestQuery, pendingQuery, reactionsQuery, requestsQuery, sentQuery]);

  const refreshing = pendingQuery.isRefetching || latestQuery.isRefetching ||
    reactionsQuery.isRefetching || requestsQuery.isRefetching || sentQuery.isRefetching;

  const renderSection = ({ item }: { item: SocialPulseSection }) => {
    if (item === 'open') {
      return <OpenNowRail gasps={pendingGasps} isLoading={pendingQuery.isLoading} isError={pendingQuery.isError} loadingId={preloadingId} onOpen={handleOpenGasp} onCapture={openCamera} onRetry={() => void pendingQuery.refetch()} />;
    }
    if (item === 'latest') {
      return <LatestMomentCard moment={latestQuery.data} isLoading={latestQuery.isLoading} isError={latestQuery.isError} onRetry={() => void latestQuery.refetch()} />;
    }
    if (item === 'reactions') {
      return <ReactionReturnSection reactions={reactionReturns} isLoading={reactionsQuery.isLoading} isError={reactionsQuery.isError} hasMore={Boolean(reactionsQuery.hasNextPage)} isLoadingMore={reactionsQuery.isFetchingNextPage} onRetry={() => void reactionsQuery.refetch()} onLoadMore={() => void reactionsQuery.fetchNextPage()} />;
    }
    if (friendRequests.length === 0 && sentGasps.length === 0) return null;
    return (
      <View>
        <SectionHeader icon={<Clock3 size={16} color={colors.textSecondary} />} title={t('gasps.pulse.activity')} count={friendRequests.length + sentGasps.length} badgeColor={colors.textTertiary} />
        {friendRequests.length > 0 ? <FriendRequestSection requests={friendRequests} onAccept={handleAccept} onReject={handleReject} processingId={processingId} /> : null}
        {sentGasps.length > 0 ? (
          <View>
            <SectionHeader icon={<Send size={15} color={colors.primaryLight} />} title={t('gasps.sentGasps')} count={sentGasps.length} badgeColor={colors.primary} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sentRail}>
              {sentGasps.map((gasp) => <SentGaspItem key={gasp.id} gasp={gasp} />)}
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GaspsPulseHeader waitingCount={pendingGasps.length} onCameraPress={openCamera} />
      <FlatList
        data={sections}
        keyExtractor={(item) => item}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sentRail: { paddingHorizontal: 12, gap: 4 },
});
