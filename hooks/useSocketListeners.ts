import { addMessageToCache } from '@/hooks/queries/useChat';
import { queryClient } from '@/lib/queryClient';
import type { Conversation, Message } from '@/services/api/schemas/chat.schema';
import { ApiReactionSchema, normalizeReaction, type Gasp } from '@/services/api/schemas/gasp.schema';
import { validateResponse } from '@/services/api/schemas/common.schema';
import { queryKeys } from '@/services/queryKeys';
import { invalidateSocialPulseReactionCaches } from '@/services/socialPulseCache';
import {
    getSocket,
    onChatConversationUpdated,
    onChatMessageRead,
    onChatNewMessage,
    onChatTyping,
    onGaspExpired,
    onGaspReactionReceived,
    onGaspReceived,
    onGaspStatusUpdated,
    onGaspViewed,
    onNotificationEvent,
    onPresenceBulkStatus,
    onPresenceUserOffline,
    onPresenceUserOnline,
} from '@/services/socket';
import type { NotificationEvent } from '@/services/socket';
import { resolveNotificationRoute, resolveBusinessNotificationRoute } from '@/services/notificationRouting';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useGaspStore } from '@/stores/gaspStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useEffect } from 'react';

/**
 * Registers all Socket.IO listeners for real-time updates.
 * Data events (gasps, messages, conversations) update React Query cache directly.
 * UI events (presence, typing) continue updating Zustand stores.
 * Should be called once in the root layout after auth.
 */
export function useSocketListeners() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !getSocket()) return;

    const cleanups: (() => void)[] = [];

    // ── Gasp events → React Query cache ─────────────────────────
    cleanups.push(
      onGaspReceived(({ gasp }) => {
        if (gasp.campaignId) {
          const actor = useAuthStore.getState().user?.id;
          if (actor !== gasp.recipientId) return;
          if (actor) void queryClient.invalidateQueries({ queryKey: queryKeys.business.inbox(actor) });
          // The matching stable notification event supplies the business handle/route.
          // Never insert campaign content or show a personal GASP toast.
          return;
        }
        const pendingGasps = queryClient.getQueryData<Gasp[]>(queryKeys.gasps.pending) ?? [];
        if (pendingGasps.some((existing) => existing.id === gasp.id)) return;

        queryClient.setQueryData<Gasp[]>(queryKeys.gasps.pending, (old) =>
          [gasp, ...(old ?? [])],
        );
        useNotificationStore.getState().enqueueToast({
          id: gasp.id,
          kind: 'gasp.received',
          title: gasp.senderName || 'Someone',
          body: 'sent you a gasp',
          actorName: gasp.senderName,
          actorAvatarUrl: gasp.senderAvatarUrl ?? undefined,
          route: `/(modals)/view-gasp?gaspId=${gasp.id}`,
          gaspId: gasp.id,
          imageUri: gasp.imageUri,
          blurhash: gasp.blurhash,
          mediaType: gasp.mediaType,
        });
        useNotificationStore.getState().setInboxUnreadType('gasp');
        useNotificationStore.getState().triggerTabPulse();
      }),
    );

    cleanups.push(
      onGaspViewed(({ gaspId }) => {
        const pending = queryClient.getQueryData<Gasp[]>(queryKeys.gasps.pending);
        const gasp = pending?.find((g) => g.id === gaspId);
        queryClient.setQueryData<Gasp[]>(queryKeys.gasps.pending, (old) =>
          old?.filter((g) => g.id !== gaspId) ?? [],
        );
        useGaspStore.getState().markGaspViewed(gaspId, gasp?.imageUri);
      }),
    );

    cleanups.push(
      onGaspReactionReceived(({ reaction, gaspId, conversationId, reactionMessageId, actorName, actorAvatarUrl }) => {
        const rawReaction = validateResponse(
          ApiReactionSchema,
          reaction,
          'socket:gasp:reaction_received',
        );
        const sentGasp = queryClient
          .getQueryData<Gasp[]>(queryKeys.gasps.sent)
          ?.find((gasp) => gasp.id === gaspId);
        const normalizedReaction = {
          ...normalizeReaction(rawReaction),
          reactorName: actorName || 'Someone',
          originalImageUri: sentGasp?.imageUri ?? sentGasp?.imageUrl ?? '',
        };

        useGaspStore.getState().addReaction(normalizedReaction);
        void invalidateSocialPulseReactionCaches(queryClient);
        useNotificationStore.getState().enqueueToast({
          id: normalizedReaction.id,
          kind: 'gasp.reaction_received',
          title: normalizedReaction.reactorName,
          body: 'reacted to your gasp',
          actorName: normalizedReaction.reactorName,
          actorAvatarUrl,
          route: resolveNotificationRoute({
            kind: 'gasp.reaction_received',
            conversationId,
            reactionMessageId,
            actorName: normalizedReaction.reactorName,
            actorAvatarUrl,
          }),
          gaspId,
          reactionId: normalizedReaction.id,
        });
        useNotificationStore.getState().setInboxUnreadType('reaction');
      }),
    );

    cleanups.push(
      onNotificationEvent((event) => {
        const activeConversationId = useChatStore.getState().activeConversationId;
        if (event.kind === 'message.new' && event.conversationId === activeConversationId) return;

        if (event.kind === 'gasp.received' && resolveBusinessNotificationRoute(event.route)) {
          const actor = useAuthStore.getState().user?.id;
          if (actor !== event.recipientId) return;
          if (actor) void queryClient.invalidateQueries({ queryKey: queryKeys.business.inbox(actor) });
        }

        useNotificationStore.getState().enqueueToast(toastFromNotificationEvent(event));

        if (event.kind === 'message.new') {
          useNotificationStore.getState().setChatHasUnread(true);
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        }
        if (event.kind === 'friend.request') {
          queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests });
        }
        if (event.kind === 'friend.accepted') {
          queryClient.invalidateQueries({ queryKey: queryKeys.friends.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests });
        }
      }),
    );

    cleanups.push(
      onGaspExpired(({ gaspId }) => {
        queryClient.setQueryData<Gasp[]>(queryKeys.gasps.pending, (old) =>
          old?.filter((g) => g.id !== gaspId) ?? [],
        );
      }),
    );

    cleanups.push(
      onGaspStatusUpdated(({ gaspId, deliveryStatus }) => {
        queryClient.setQueryData<Gasp[]>(queryKeys.gasps.sent, (old) =>
          old?.map((g) => g.id === gaspId ? { ...g, deliveryStatus } : g) ?? [],
        );
      }),
    );

    // ── Presence events → Zustand (UI state) ────────────────────
    cleanups.push(
      onPresenceBulkStatus(({ statuses }) => {
        const onlineIds = statuses.map((s) => s.userId);
        useInboxStore.getState().setBulkOnlineStatus(onlineIds);
      }),
    );

    cleanups.push(
      onPresenceUserOnline(({ userId }) => {
        useInboxStore.getState().setFriendOnlineStatus(userId, 'online');
      }),
    );

    cleanups.push(
      onPresenceUserOffline(({ userId }) => {
        useInboxStore.getState().setFriendOnlineStatus(userId, 'offline');
      }),
    );

    // ── Chat events → React Query cache + Zustand UI ────────────
    cleanups.push(
      onChatNewMessage(({ conversationId, message, actorName, actorAvatarUrl }) => {
        addMessageToCache(queryClient, conversationId, message);
        if (shouldRefetchReactionMessage(message)) {
          queryClient.invalidateQueries({ queryKey: queryKeys.messages.byConversation(conversationId) });
        }

        const activeId = useChatStore.getState().activeConversationId;
        const currentUserId = useAuthStore.getState().user?.id;

        // Only increment unreadCount for the recipient — never for the sender
        const isOwnMessage = currentUserId != null && message.senderId === currentUserId;

        let latestConversations: Conversation[] = [];
        let hasConversationInCache = false;
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) => {
          if (!old) return [];
          latestConversations = old;
          hasConversationInCache = old.some((conversation) => conversation.id === conversationId);
          return old.map((c) => {
            if (c.id !== conversationId) return c;
            const isDuplicate = c.lastMessage?.id === message.id;
            const shouldIncrement = !isDuplicate && !isOwnMessage && c.id !== activeId;
            return {
              ...c,
              lastMessage: message,
              updatedAt: message.createdAt,
              lastMessageAt: message.createdAt,
              unreadCount: shouldIncrement ? c.unreadCount + 1 : c.unreadCount,
            };
          });
        });

        // A first incoming message can belong to a conversation that has not
        // reached the local list yet. Refetch its server-authoritative
        // participant metadata instead of fabricating a partial cache entry.
        if (!hasConversationInCache) {
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        }

        if (!isOwnMessage && conversationId !== activeId) {
          useNotificationStore.getState().setChatHasUnread(true);

          if (!shouldEnqueueChatMessageToast(message)) return;

          const participant = participantForConversationToast(
            conversationId,
            latestConversations,
            message.senderId,
            currentUserId,
          );
          useNotificationStore.getState().enqueueToast({
            id: message.id,
            kind: 'message.new',
            title: actorName ?? participant.name ?? 'Someone',
            body: message.content,
            actorName: actorName ?? participant.name,
            actorAvatarUrl: actorAvatarUrl ?? participant.avatarUrl,
            route: resolveNotificationRoute({
              kind: 'message.new',
              conversationId,
              actorName: actorName ?? participant.name,
              actorAvatarUrl: actorAvatarUrl ?? participant.avatarUrl,
            }),
            conversationId,
          });
        }
      }),
    );

    cleanups.push(
      onChatTyping(({ conversationId, userId, isTyping }) => {
        useChatStore.getState().setTypingUser(conversationId, userId, isTyping);
      }),
    );

    cleanups.push(
      onChatMessageRead(({ conversationId }) => {
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) =>
          old?.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c,
          ) ?? [],
        );
      }),
    );

    cleanups.push(
      onChatConversationUpdated(({ conversationId, lastMessage }) => {
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) =>
          old?.map((c) =>
            c.id === conversationId
              ? { ...c, lastMessage, updatedAt: lastMessage.createdAt, lastMessageAt: lastMessage.createdAt }
              : c,
          ) ?? [],
        );
      }),
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [isAuthenticated]);
}

function shouldRefetchReactionMessage(message: Message) {
  return message.type === 'reaction' && !!message.replyToId && !message.replyToMessage;
}

function shouldEnqueueChatMessageToast(message: Message) {
  return message.type === 'text' || message.type === 'image';
}

function participantForConversationToast(
  conversationId: string,
  conversations: Conversation[],
  messageSenderId?: string,
  currentUserId?: string,
): { name?: string; avatarUrl?: string } {
  const conversation = conversations.find((c) => c.id === conversationId);
  const senderIndex = conversation?.participantIds?.findIndex((id) => id === messageSenderId) ?? -1;
  const otherIndex = senderIndex >= 0
    ? senderIndex
    : conversation?.participantIds?.findIndex((id) => id !== currentUserId) ?? -1;
  const name = otherIndex >= 0 ? conversation?.participantNames?.[otherIndex] : undefined;
  const avatarUrl = otherIndex >= 0 ? conversation?.participantAvatars?.[otherIndex] : undefined;
  return { name, avatarUrl: avatarUrl ?? undefined };
}

function toastFromNotificationEvent(event: NotificationEvent) {
  const id = event.eventId
    ?? event.reactionId
    ?? event.gaspId
    ?? (event.conversationId ? `${event.conversationId}:${event.kind}` : `${event.actorId}:${event.kind}`);

  return {
    id,
    kind: event.kind,
    title: event.actorName || 'Someone',
    body: notificationBody(event),
    actorName: event.actorName,
    actorAvatarUrl: event.actorAvatarUrl,
    route: resolveNotificationRoute(event),
    conversationId: event.conversationId,
    gaspId: event.gaspId,
    reactionId: event.reactionId,
  };
}

function notificationBody(event: NotificationEvent) {
  switch (event.kind) {
    case 'message.new':
      return event.body;
    case 'gasp.received':
      return 'sent you a gasp';
    case 'gasp.reaction_received':
      return 'reacted to your gasp';
    case 'friend.request':
      return 'sent you a friend request';
    case 'friend.accepted':
      return 'accepted your request';
  }
}
