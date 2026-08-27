import { DiscoverHeader } from '@/components/discover/DiscoverHeader';
import { RecommendedSection } from '@/components/discover/RecommendedSection';
import { UserCardSkeleton } from '@/components/discover/UserCardSkeleton';
import {
    UserSearchResult,
    type RequestStatus,
} from '@/components/discover/UserSearchResult';
import { QueryState } from '@/components/ui/QueryState';
import { SearchBar } from '@/components/ui/SearchBar';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { useAcceptFriendRequest, usePendingFriendRequests, useRejectFriendRequest, useSendFriendRequest } from '@/hooks/queries/useFriends';
import * as discoverApi from '@/services/api/discover';
import type { User } from '@/services/api/schemas/user.schema';
import * as usersApi from '@/services/api/users';
import { queryKeys } from '@/services/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Users, UserX } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const friends = useInboxStore((s) => s.friends);
  const sendFriendRequestMutation = useSendFriendRequest();
  const acceptMutation = useAcceptFriendRequest();
  const rejectMutation = useRejectFriendRequest();
  const { data: pendingRequests } = usePendingFriendRequests();

  const pendingRequestMap = useMemo(() => {
    const map = new Map<string, string>();
    pendingRequests?.forEach((r) => map.set(r.requester.id, r.friendshipId));
    return map;
  }, [pendingRequests]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());

  const { data: peopleYouMayKnow, isLoading: isLoadingRecs, isError: isErrorRecs, refetch: refetchRecs } = useQuery({
    queryKey: queryKeys.discover.recommended,
    queryFn: () => discoverApi.getRecommendedUsers(),
  });

  const { data: topGaspers = [] } = useQuery({
    queryKey: queryKeys.discover.topGaspers,
    queryFn: () => discoverApi.getTopGaspers(),
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await usersApi.searchUsers(searchQuery.trim());
        setSearchResults(results);
        setHasSearched(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const getRequestStatus = useCallback(
    (userId: string): RequestStatus => {
      if (friends.some((f) => f.id === userId)) return 'already_friends';
      if (sentRequestIds.has(userId)) return 'sent';
      return 'none';
    },
    [friends, sentRequestIds],
  );

  const handleAdd = useCallback(async (addresseeId: string) => {
    try {
      await sendFriendRequestMutation.mutateAsync(addresseeId);
      setSentRequestIds((prev) => new Set(prev).add(addresseeId));
    } catch {
      // Silently fail — UserCard handles its own error state
    }
  }, [sendFriendRequestMutation]);

  const handleAccept = useCallback((friendshipId: string) => {
    acceptMutation.mutate(friendshipId);
  }, [acceptMutation]);

  const handleReject = useCallback((friendshipId: string) => {
    rejectMutation.mutate(friendshipId);
  }, [rejectMutation]);

  const isShowingSearch = searchQuery.trim().length > 0 || hasSearched;

  const renderSearchResult = useCallback(({ item }: { item: User }) => (
    <UserSearchResult
      id={item.id}
      displayName={item.displayName}
      username={item.username}
      avatarUrl={item.avatarUrl}
      accountType={item.accountType}
      status={getRequestStatus(item.id)}
      onAdd={handleAdd}
    />
  ), [getRequestStatus, handleAdd]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={isShowingSearch ? searchResults : []}
        renderItem={renderSearchResult}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        ListHeaderComponent={
          <View>
            <DiscoverHeader />

            <View style={styles.searchContainer}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by username or name..."
              />
            </View>

            {!isShowingSearch && (
              <View style={styles.recommendationsContainer}>
                {topGaspers.length > 0 && (
                  <RecommendedSection
                    title="Top Gaspers"
                    icon={<Trophy size={18} color="#F59E0B" />}
                    users={topGaspers}
                    showGradientRing
                    onAddUser={handleAdd}
                    friendIds={friendIds}
                    pendingRequestMap={pendingRequestMap}
                    onAcceptRequest={handleAccept}
                    onRejectRequest={handleReject}
                  />
                )}

                <QueryState
                  data={isErrorRecs ? [] : peopleYouMayKnow}
                  isLoading={isLoadingRecs}
                  isError={false}
                  refetch={refetchRecs}
                  skeleton={<UserCardSkeleton count={4} />}
                  isEmpty={(d) => d.length === 0 && topGaspers.length === 0}
                  emptyTitle="No suggestions yet"
                  emptySubtitle="Add friends to see recommendations"
                  emptyIcon={<Users size={40} color={colors.textTertiary} />}
                >
                  {(recs) => (
                    <RecommendedSection
                      title="People You May Know"
                      icon={<Users size={18} color={colors.accentPink} />}
                      users={recs}
                      onAddUser={handleAdd}
                      friendIds={friendIds}
                      pendingRequestMap={pendingRequestMap}
                      onAcceptRequest={handleAccept}
                      onRejectRequest={handleReject}
                    />
                  )}
                </QueryState>
              </View>
            )}

            {isSearching && (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}

            {!isSearching && hasSearched && searchResults.length === 0 && (
              <View style={styles.centerState}>
                <UserX size={48} color={colors.textTertiary} />
                <Text variant="body" style={styles.emptyTitle}>
                  {'No users found'}
                </Text>
                <Text variant="caption" style={styles.emptySubtitle}>
                  {`No results for "${searchQuery}"`}
                </Text>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  recommendationsContainer: {
    gap: 24,
    paddingBottom: 16,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
