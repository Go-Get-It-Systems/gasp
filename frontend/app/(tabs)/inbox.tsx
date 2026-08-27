import { FeedCard } from "@/components/inbox/FeedCard";
import { FeedCardSkeleton } from "@/components/inbox/FeedCardSkeleton";
import { FeedHeader } from "@/components/inbox/FeedHeader";
import { FriendRequestSection } from "@/components/inbox/FriendRequestSection";
import { ReactionSection } from "@/components/inbox/ReactionSection";
import { SectionHeader } from "@/components/inbox/SectionHeader";
import { SentGaspItem } from "@/components/inbox/SentGaspItem";
import { QueryState } from "@/components/ui/QueryState";
import { colors } from "@/constants/colors";
import {
    useAcceptFriendRequest,
    usePendingFriendRequests,
    useRejectFriendRequest,
} from "@/hooks/queries/useFriends";
import { usePendingGasps, useSentGasps } from "@/hooks/queries/useGasps";
import type { Gasp } from "@/services/api/schemas/gasp.schema";
import { openGaspViewer } from "@/services/navigation";
import { useGaspStore } from "@/stores/gaspStore";
import { router } from "expo-router";
import { Camera, Flame, Send } from "lucide-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Friend requests
  const {
    data: friendRequests = [],
    isLoading: isLoadingRequests,
    isRefetching: isRefetchingRequests,
    refetch: refetchRequests,
  } = usePendingFriendRequests();
  const acceptMutation = useAcceptFriendRequest();
  const rejectMutation = useRejectFriendRequest();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = useCallback(
    (friendshipId: string) => {
      if (processingId) return;
      setProcessingId(friendshipId);
      acceptMutation.mutate(friendshipId, {
        onSettled: () => setProcessingId(null),
      });
    },
    [acceptMutation, processingId],
  );

  const handleReject = useCallback(
    (friendshipId: string) => {
      if (processingId) return;
      setProcessingId(friendshipId);
      rejectMutation.mutate(friendshipId, {
        onSettled: () => setProcessingId(null),
      });
    },
    [rejectMutation, processingId],
  );

  // Gasps
  const {
    data: pendingGasps = [],
    isLoading: isLoadingGasps,
    isRefetching: isRefetchingGasps,
    refetch: refetchGasps,
  } = usePendingGasps();

  // Sent gasps
  const {
    data: sentGasps = [],
    isRefetching: isRefetchingSent,
    refetch: refetchSent,
  } = useSentGasps();

  // Reactions (from Zustand store)
  const reactions = useGaspStore((s) => s.reactions);

  // Refresh all
  const handleRefresh = useCallback(() => {
    refetchGasps();
    refetchRequests();
    refetchSent();
  }, [refetchGasps, refetchRequests, refetchSent]);

  const [preloadingId, setPreloadingId] = useState<string | null>(null);

  const handleCardPress = useCallback(
    async (gasp: Gasp) => {
      if (preloadingId) return;
      setPreloadingId(gasp.id);
      await openGaspViewer({
        imageUri: gasp.imageUri,
        senderName: gasp.senderName,
        mediaType: gasp.mediaType,
        blurhash: gasp.blurhash,
        textOverlay: gasp.textOverlay,
        gaspId: gasp.id,
      });
      setPreloadingId(null);
    },
    [preloadingId],
  );

  const newCount =
    pendingGasps.filter((g) => g.status === "pending").length +
    friendRequests.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FeedHeader newCount={newCount} />

      {isLoadingGasps && pendingGasps.length === 0 ? (
        <FeedCardSkeleton />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={
                isRefetchingGasps || isRefetchingRequests || isRefetchingSent
              }
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Section 1: Friend Requests */}
          {friendRequests.length > 0 && (
            <FriendRequestSection
              requests={friendRequests}
              onAccept={handleAccept}
              onReject={handleReject}
              processingId={processingId}
            />
          )}

          {/* Section 2: Gasps */}
          {pendingGasps.length > 0 && (
            <>
              <SectionHeader
                icon={<Flame size={16} color="#EC4899" />}
                title={t("gasps.newGasps")}
                count={pendingGasps.length}
                badgeColor="#EC4899"
              />
              {pendingGasps.map((gasp) => (
                <Pressable
                  key={gasp.id}
                  onPress={() => handleCardPress(gasp)}
                  accessibilityRole="button"
                  accessibilityLabel={`View gasp from ${gasp.senderName}`}
                >
                  {preloadingId === gasp.id && (
                    <View style={styles.preloadOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  )}
                  <FeedCard
                    senderName={gasp.senderName}
                    senderAvatarUrl={gasp.senderAvatarUrl}
                    imageUri={gasp.imageUri}
                    blurhash={gasp.blurhash}
                    createdAt={gasp.createdAt}
                    expiresAt={gasp.expiresAt}
                  />
                </Pressable>
              ))}
            </>
          )}

          {/* Section 3: Reactions */}
          {reactions.length > 0 && <ReactionSection reactions={reactions} />}

          {/* Section 4: Sent Gasps with delivery status */}
          {sentGasps.length > 0 && (
            <>
              <SectionHeader
                icon={<Send size={16} color={colors.primary} />}
                title={t("gasps.sentGasps")}
                count={sentGasps.length}
                badgeColor={colors.primary}
              />
              <FlatList
                horizontal
                data={sentGasps}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <SentGaspItem gasp={item} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sentGaspsList}
                scrollEnabled
              />
            </>
          )}

          {/* Global empty state */}
          {friendRequests.length === 0 &&
            pendingGasps.length === 0 &&
            reactions.length === 0 &&
            sentGasps.length === 0 &&
            !isLoadingGasps &&
            !isLoadingRequests && (
              <QueryState
                data={[]}
                isLoading={false}
                isError={false}
                refetch={() => {}}
                skeleton={null}
                emptyTitle={t("gasps.noActivity")}
                emptySubtitle={t("gasps.sendGaspToFriend")}
                emptyIcon={<Camera size={40} color={colors.textTertiary} />}
                emptyCta={{
                  label: t("gasps.openCamera"),
                  onPress: () => router.push("/(tabs)/camera"),
                }}
              >
                {() => null}
              </QueryState>
            )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  preloadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 16,
  },
  sentGaspsList: {
    paddingHorizontal: 12,
    gap: 4,
  },
});
