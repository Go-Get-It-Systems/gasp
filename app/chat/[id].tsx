import { useEffect, useCallback, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Alert } from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useConversation, useConversations, useMessages, flattenMessages, useMarkAsRead } from '@/hooks/queries/useChat';
import { chatJoinConversation, chatLeaveConversation, chatMarkRead, onSocketConnect } from '@/services/socket';
import { resolveChatParticipant } from '@/services/chatParticipant';
import { findMessageIndex } from '@/services/chatMessageHighlight';
import { colors } from '@/constants/colors';
import type { Message } from '@/services/api/schemas/chat.schema';
import { openFriendProfile } from '@/services/navigation';
import { ReportSheet } from '@/components/safety/ReportSheet';

const keyExtractor = (item: Message) => item.id;

export default function ChatScreen() {
  const { t } = useTranslation();
  const { id, name, avatarUrl, highlightMessageId } = useLocalSearchParams<{
    id: string;
    name?: string;
    avatarUrl?: string;
    highlightMessageId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const user = useAuthStore((s) => s.user);
  const { sendMessage } = useChatStore();

  const { data: messagesData, isLoading: isLoadingMessages, fetchNextPage, hasNextPage, isFetchingNextPage: isLoadingMore } = useMessages(id);
  const messages = flattenMessages(messagesData);
  const { mutate: markAsRead } = useMarkAsRead();

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const highlightedMessageIndex = findMessageIndex(messages, highlightMessageId);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | undefined>(undefined);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightMessageId || highlightedMessageIndex < 0) return;

    setHighlightedMessageId(highlightMessageId);
    const frame = requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: highlightedMessageIndex,
        animated: true,
        viewPosition: 0.5,
      });
    });
    const timeout = setTimeout(() => setHighlightedMessageId(undefined), 3_000);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [highlightMessageId, highlightedMessageIndex]);

  const { data: conversations = [] } = useConversations();
  const conversation = conversations.find((c) => c.id === id);
  const { data: fetchedConversation } = useConversation(id, !conversation && !name);
  const otherParticipant = resolveChatParticipant({
    conversation,
    fetchedConversation,
    currentUserId: user?.id,
    currentUsername: user?.username,
    currentDisplayName: user?.displayName,
    routeName: name,
    routeAvatarUrl: avatarUrl,
  });
  const otherParticipantName = otherParticipant.name;
  const otherParticipantAvatar = otherParticipant.avatarUrl;
  const otherParticipantId = otherParticipant.id;

  useEffect(() => {
    if (id) {
      chatJoinConversation(id);
      chatMarkRead(id);
      markAsRead(id);
      const unsubscribeReconnect = onSocketConnect(() => chatJoinConversation(id));
      return () => {
        unsubscribeReconnect();
        chatLeaveConversation(id);
      };
    }
  }, [id, markAsRead]);

  const handleSend = useCallback((text: string) => {
    if (id) {
      sendMessage(id, text, 'text');
    }
  }, [id, sendMessage]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isLoadingMore) {
      fetchNextPage();
    }
  }, [hasNextPage, isLoadingMore, fetchNextPage]);

  // Scroll-to-bottom button
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isScrolledRef = useRef(false);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const shouldShow = e.nativeEvent.contentOffset.y > 300;
    if (isScrolledRef.current !== shouldShow) {
      isScrolledRef.current = shouldShow;
      setShowScrollToBottom(shouldShow);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Stable ref for otherParticipantName to avoid renderItem dep on it
  const otherNameRef = useRef(otherParticipantName);
  otherNameRef.current = otherParticipantName;

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user?.id;
    const currentMessages = messagesRef.current;
    const nextMessage = index > 0 ? currentMessages[index - 1] : null;
    const dayChanges = nextMessage
      ? item.createdAt.substring(0, 10) !== nextMessage.createdAt.substring(0, 10)
      : false;
    const isSequential = !dayChanges && nextMessage?.senderId === item.senderId;

    // Resolve reply-to message for reactions
    const replyToMessage = item.replyToId
      ? item.replyToMessage ?? currentMessages.find((m) => m.id === item.replyToId) ?? null
      : null;

    // Date separator: show when date changes from the older message (index+1) or it's the oldest message
    const olderMessage = currentMessages[index + 1];
    const currentDay = item.createdAt.substring(0, 10);
    const olderDay = olderMessage ? olderMessage.createdAt.substring(0, 10) : null;
    const showDateSeparator = !olderDay || currentDay !== olderDay;

    return (
      <>
        <MessageBubble
          message={item}
          isOwnMessage={isOwnMessage}
          isSequential={isSequential}
          isHighlighted={item.id === highlightedMessageId}
          replyToMessage={replyToMessage}
          otherParticipantName={otherNameRef.current}
          onLongPress={!isOwnMessage ? () => setReportMessageId(item.id) : undefined}
        />
        {showDateSeparator && <DateSeparator date={item.createdAt} />}
      </>
    );
  }, [highlightedMessageId, user?.id]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft size={24} color={colors.textPrimary} />}
            variant="ghost"
            onPress={() => router.back()}
          />
          <Pressable
            style={styles.headerInfo}
            onPress={() => otherParticipantId && openFriendProfile({
              userId: otherParticipantId,
              displayName: otherParticipantName,
              avatarUrl: otherParticipantAvatar,
            })}
            disabled={!otherParticipantId}
            accessibilityRole="button"
            accessibilityLabel={`View ${otherParticipantName}'s profile`}
          >
            <Avatar uri={otherParticipantAvatar || null} size={40} initials={otherParticipantName} />
            <Text variant="subtitle" style={styles.title}>{otherParticipantName}</Text>
          </Pressable>
          <View style={styles.headerTrailing} />
        </View>

        {/* Message List */}
        <View style={styles.listWrapper}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            inverted
            contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            scrollEventThrottle={16}
            onScroll={handleScroll}
            windowSize={5}
            maxToRenderPerBatch={8}
            initialNumToRender={10}
            removeClippedSubviews={Platform.OS === 'android'}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 16 }} />
              ) : null
            }
            ListEmptyComponent={
              isLoadingMessages ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text variant="body" style={styles.emptyText}>Start the conversation by sending a gasp!</Text>
                </View>
              )
            }
          />

          {showScrollToBottom && (
            <Pressable style={styles.scrollToBottom} onPress={scrollToBottom}>
              <ChevronDown size={22} color={colors.textPrimary} />
            </Pressable>
          )}
        </View>

        {/* Input Area */}
        <ChatInput onSend={handleSend} isLoading={isLoadingMessages && messages.length === 0} />
      </View>
      <ReportSheet
        visible={!!reportMessageId}
        targetType="message"
        targetId={reportMessageId ?? ''}
        onClose={() => setReportMessageId(null)}
        onSubmitted={() => {
          setReportMessageId(null);
          Alert.alert(t('safety.report.receivedTitle'), t('safety.report.receivedBody'));
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    zIndex: 10,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerTrailing: {
    width: 44, // balance back button
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 8,
  },
  scrollToBottom: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
