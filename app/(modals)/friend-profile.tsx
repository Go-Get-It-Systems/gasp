import { ActivityCard } from '@/components/profile/ActivityCard';
import { FriendActionButtons, type FriendshipStatus } from '@/components/profile/FriendActionButtons';
import { FriendProfileHeader } from '@/components/profile/FriendProfileHeader';
import { MutualFriendsSection } from '@/components/profile/MutualFriendsSection';
import { ProfileMenu } from '@/components/profile/ProfileMenu';
import { StatsCard } from '@/components/profile/StatsCard';
import { BlockUserConfirmation } from '@/components/safety/BlockUserConfirmation';
import { ReportSheet } from '@/components/safety/ReportSheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';
import { useGetOrCreateConversation } from '@/hooks/queries/useChat';
import {
    useAcceptFriendRequest,
    useFriends,
    usePendingFriendRequests,
    useRejectFriendRequest,
    useRemoveFriend,
    useSendFriendRequest,
} from '@/hooks/queries/useFriends';
import { calculateGaspScore } from '@/hooks/queries/useProfile';
import { useBlockUser } from '@/hooks/queries/useSafety';
import { useUserProfile, useUserStats } from '@/hooks/queries/useUserProfile';
import { openChat } from '@/services/navigation';
import * as Sentry from '@sentry/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MoreHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FriendProfileScreen() {
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [blockVisible, setBlockVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const { t } = useTranslation();

  const { userId, displayName, avatarUrl } = useLocalSearchParams<{
    userId: string;
    displayName: string;
    avatarUrl?: string;
  }>();

  const { data: profile } = useUserProfile(userId);
  const { data: stats, isError: statsError } = useUserStats(userId);

  const { data: friends = [] } = useFriends();
  const { data: friendRequests = [] } = usePendingFriendRequests();

  const friendEntry = friends.find((f) => f.id === userId);
  const isFriend = !!friendEntry;
  const pendingRequest = friendRequests.find((r) => r.requester.id === userId);

  const friendshipStatus: FriendshipStatus = (() => {
    // Optimistic local override after pressing "Add Friend" on this screen
    if (requestSent) return 'request_sent';
    // Server-side authority — covers requests sent from other screens (e.g. Discover)
    if (profile?.friendshipStatus === 'friends') return 'friends';
    if (profile?.friendshipStatus === 'pending_outgoing') return 'request_sent';
    if (profile?.friendshipStatus === 'pending_incoming') return 'request_received';
    if (profile?.friendshipStatus === 'none') return 'none';
    // Legacy fallback for clients hitting an older backend response
    if (isFriend) return 'friends';
    if (pendingRequest) return 'request_received';
    return 'none';
  })();

  const name = profile?.displayName ?? displayName ?? '';
  const username = profile?.username ?? '';
  const avatar = profile?.avatarUrl ?? avatarUrl ?? null;

  const gaspScore = stats
    ? calculateGaspScore(
        stats.gaspsSent,
        stats.gaspsReceived,
        stats.streak ?? 0,
        stats.reactionsReceived ?? 0,
      )
    : undefined;

  const sendFriendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();
  const getOrCreateConversation = useGetOrCreateConversation();
  const blockUser = useBlockUser();

  // ── Business account: redirect to dedicated business profile modal ──────
  const isBusiness = profile?.accountType === 'business';

  if (isBusiness && profile) {
    router.replace({
      pathname: '/(modals)/business-profile',
      params: {
        userId,
        displayName: name,
        avatarUrl: avatar ?? '',
        workspaceHandle: profile.username,
      },
    });
    return null;
  }

  const handleSendGasp = () => {
    router.back();
    router.push('/(tabs)/camera');
  };

  const handleChat = async () => {
    try {
      const conv = await getOrCreateConversation.mutateAsync(userId);
      router.back();
      openChat({ conversationId: conv.id, name, avatarUrl: avatar ?? undefined });
    } catch (e) {
      Sentry.captureException(e);
      Alert.alert('Error', 'Could not open chat. Please try again.');
    }
  };

  const handleAddFriend = () => {
    sendFriendRequest.mutate(userId, {
      onSuccess: () => setRequestSent(true),
      onError: (e) => {
        Sentry.captureException(e);
        Alert.alert('Error', 'Could not send friend request. Please try again.');
      },
    });
  };

  const handleAccept = () => {
    if (pendingRequest) {
      acceptRequest.mutate(pendingRequest.friendshipId);
    }
  };

  const handleDecline = () => {
    if (pendingRequest) {
      rejectRequest.mutate(pendingRequest.friendshipId);
      router.back();
    }
  };

  const handleRemoveFriend = () => {
    if (friendEntry) {
      removeFriend.mutate(friendEntry.friendshipId);
      router.back();
    }
  };

  const handleBlock = () => setBlockVisible(true);

  const handleReport = () => setReportVisible(true);

  const confirmBlock = () => {
    blockUser.mutate(userId, {
      onSuccess: () => {
        setBlockVisible(false);
        Alert.alert(t('safety.block.successTitle'), t('safety.block.successBody'));
        router.back();
      },
      onError: (error) => {
        Sentry.captureException(error);
        Alert.alert(t('common.error'), t('safety.block.error'));
      },
    });
  };

  const onReportSubmitted = () => {
    setReportVisible(false);
    Alert.alert(t('safety.report.receivedTitle'), t('safety.report.receivedBody'));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={styles.iconButton}
          accessibilityLabel="Profile options"
          accessibilityRole="button"
        >
          <MoreHorizontal size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FriendProfileHeader
          displayName={name}
          username={username}
          avatarUrl={avatar}
          gaspScore={gaspScore}
        />

        {/* Stats — show skeleton while loading, hide on error */}
        {stats ? (
          <StatsCard
            gaspsSent={stats.gaspsSent}
            gaspsReceived={stats.gaspsReceived}
            friendsCount={stats.friendsCount}
          />
        ) : !statsError ? (
          <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={80} borderRadius={16} />
          </View>
        ) : null}

        <FriendActionButtons
          status={friendshipStatus}
          onSendGasp={handleSendGasp}
          onChat={handleChat}
          onAddFriend={handleAddFriend}
          onAcceptRequest={handleAccept}
          onDeclineRequest={handleDecline}
          isProcessing={
            sendFriendRequest.isPending || acceptRequest.isPending || rejectRequest.isPending
          }
        />

        {/* Activity — show only if stats loaded */}
        {stats && (
          <ActivityCard
            streak={stats.streak ?? 0}
            reactionsReceived={stats.reactionsReceived ?? 0}
            memberSince={profile?.createdAt ?? ''}
          />
        )}

        <MutualFriendsSection />
      </ScrollView>

      <ProfileMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isFriend={isFriend}
        onRemoveFriend={handleRemoveFriend}
        onBlock={handleBlock}
        onReport={handleReport}
      />
      <BlockUserConfirmation
        visible={blockVisible}
        displayName={name}
        isSubmitting={blockUser.isPending}
        onCancel={() => setBlockVisible(false)}
        onConfirm={confirmBlock}
      />
      <ReportSheet
        visible={reportVisible}
        targetType="profile"
        targetId={userId}
        onClose={() => setReportVisible(false)}
        onSubmitted={onReportSubmitted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 20,
  },
  skeletonContainer: {
    paddingHorizontal: 20,
  },
});
