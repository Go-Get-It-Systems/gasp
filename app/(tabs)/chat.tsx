import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LegendList } from '@legendapp/list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { openChat } from '@/services/navigation';
import { InboxHeader } from '@/components/inbox/InboxHeader';
import { FriendListItem } from '@/components/inbox/FriendListItem';
import { ChatViewToggle, type ChatView } from '@/components/chat/ChatViewToggle';
import { ConversationListItem } from '@/components/chat/ConversationListItem';
import { ConversationListSkeleton } from '@/components/chat/ConversationListSkeleton';
import { filterConversations, getConversationParticipant } from '@/components/chat/conversationPreview';
import { SearchBar } from '@/components/ui/SearchBar';
import { QueryState } from '@/components/ui/QueryState';
import { useInboxStore, mapFriendToInbox, type InboxFriend } from '@/stores/inboxStore';
import { useFriends } from '@/hooks/queries/useFriends';
import { useConversations, useGetOrCreateConversation } from '@/hooks/queries/useChat';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';
import { MessageCircle, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const presenceFriends = useInboxStore((s) => s.friends);
  const [selectedView, setSelectedView] = useState<ChatView>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: conversations,
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useConversations();
  const {
    data: friends,
    isLoading: isFriendsLoading,
    isError: isFriendsError,
    refetch: refetchFriends,
  } = useFriends();

  const getOrCreateConversation = useGetOrCreateConversation();

  const friendRows = useMemo(() => {
    if (!friends) return undefined;
    const presenceById = new Map(presenceFriends.map((friend) => [friend.id, friend.onlineStatus]));
    return friends.map((friend) => ({
      ...mapFriendToInbox(friend),
      onlineStatus: presenceById.get(friend.id) ?? friend.onlineStatus,
    }));
  }, [friends, presenceFriends]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredConversations = useMemo(() => {
    if (!conversations) return undefined;
    return filterConversations(conversations, searchQuery, currentUserId);
  }, [conversations, currentUserId, searchQuery]);

  const filteredFriends = useMemo(() => {
    if (!friendRows) return undefined;
    if (!normalizedSearch) return friendRows;
    return friendRows.filter(
      (friend) =>
        friend.name.toLowerCase().includes(normalizedSearch) ||
        friend.username.toLowerCase().includes(normalizedSearch),
    );
  }, [friendRows, normalizedSearch]);

  const onlineFriendIds = useMemo(
    () => new Set(friendRows?.filter((friend) => friend.onlineStatus === 'online').map((friend) => friend.id)),
    [friendRows],
  );

  const handleViewChange = useCallback((view: ChatView) => {
    setSelectedView(view);
    setSearchQuery('');
  }, []);

  const handleFriendPress = useCallback(async (friend: InboxFriend) => {
    try {
      const conv = await getOrCreateConversation.mutateAsync(friend.id);
      openChat({
        conversationId: conv.id,
        name: friend.name,
        avatarUrl: friend.avatarUrl || undefined,
      });
    } catch (error) {
      Sentry.captureException(error, {
        extra: { context: 'chatInbox.getOrCreateConversation', friendId: friend.id },
      });
    }
  }, [getOrCreateConversation]);

  const handleConversationPress = useCallback((conversationId: string, name: string, avatarUrl: string | null) => {
    openChat({ conversationId, name, avatarUrl: avatarUrl || undefined });
  }, []);

  const handleCameraPress = () => {
    router.push('/(tabs)/camera');
  };

  const renderFriendItem = useCallback(
    ({ item }: { item: InboxFriend }) => (
      <FriendListItem
        id={item.id}
        name={item.name}
        avatarUrl={item.avatarUrl}
        onlineStatus={item.onlineStatus}
        statusText={item.statusText}
        statusEmoji={item.statusEmoji}
        timestamp={item.timestamp}
        actionType={item.actionType}
        badgeCount={item.badgeCount}
        thumbnailUrl={item.thumbnailUrl}
        onPress={() => handleFriendPress(item)}
      />
    ),
    [handleFriendPress]
  );

  const renderConversationItem = useCallback(
    ({ item }: { item: NonNullable<typeof filteredConversations>[number] }) => {
      const participant = getConversationParticipant(item, currentUserId);
      return (
        <ConversationListItem
          conversation={item}
          participant={participant}
          isOnline={participant.id ? onlineFriendIds.has(participant.id) : false}
          onPress={() => handleConversationPress(item.id, participant.name, participant.avatarUrl)}
        />
      );
    },
    [currentUserId, handleConversationPress, onlineFriendIds],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <InboxHeader
        title={t('chat.inbox.title')}
        onCameraPress={handleCameraPress}
        cameraAccessibilityLabel={t('chat.inbox.openCamera')}
      />
      <ChatViewToggle value={selectedView} onChange={handleViewChange} />
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t(selectedView === 'chats' ? 'chat.inbox.searchChats' : 'chat.inbox.searchFriends')}
        />
      </View>

      <View style={styles.listContainer}>
        {selectedView === 'chats' ? (
          <QueryState
            data={filteredConversations}
            isLoading={isConversationsLoading}
            isError={isConversationsError}
            refetch={refetchConversations}
            skeleton={<ConversationListSkeleton />}
            emptyIcon={<MessageCircle size={40} color={colors.textTertiary} />}
            emptyTitle={t(normalizedSearch ? 'chat.inbox.noChatsFound' : 'chat.inbox.noChats')}
            emptySubtitle={t(normalizedSearch ? 'chat.inbox.tryAnotherSearch' : 'chat.inbox.noChatsSubtitle')}
            emptyCta={normalizedSearch ? undefined : {
              label: t('chat.inbox.createGasp'),
              onPress: handleCameraPress,
            }}
          >
            {(items) => (
              <LegendList
                data={items}
                renderItem={renderConversationItem}
                keyExtractor={(item) => item.id}
                estimatedItemSize={80}
                contentContainerStyle={styles.listContent}
                recycleItems
              />
            )}
          </QueryState>
        ) : (
          <QueryState
            data={filteredFriends}
            isLoading={isFriendsLoading}
            isError={isFriendsError}
            refetch={refetchFriends}
            skeleton={<ConversationListSkeleton />}
            emptyIcon={<Users size={40} color={colors.textTertiary} />}
            emptyTitle={t(normalizedSearch ? 'chat.inbox.noFriendsFound' : 'chat.inbox.noFriends')}
            emptySubtitle={t(normalizedSearch ? 'chat.inbox.tryAnotherSearch' : 'chat.inbox.noFriendsSubtitle')}
          >
            {(items) => (
              <LegendList
                data={items}
                renderItem={renderFriendItem}
                keyExtractor={(item) => item.id}
                estimatedItemSize={80}
                contentContainerStyle={styles.listContent}
                recycleItems
              />
            )}
          </QueryState>
        )}
      </View>
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
    paddingVertical: 12,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
});
