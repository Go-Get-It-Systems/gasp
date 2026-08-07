import type { Conversation } from '@/services/api/schemas/chat.schema';

/** Keeps the Chat marker visible during an authoritative conversations refetch. */
export function hasUnreadChatActivity(
  conversations: Conversation[] | undefined,
  hasUnreadHint: boolean,
) {
  return hasUnreadHint || conversations?.some((conversation) => conversation.unreadCount > 0) === true;
}

/**
 * Keeps the realtime hint visible until a conversations response fetched after
 * the hint is known to contain no unread activity.
 */
export function shouldClearChatUnreadHint({
  conversationsLoaded,
  conversationsHaveUnread,
  hasUnreadHint,
  hintCreatedAt,
  conversationsUpdatedAt,
}: {
  conversationsLoaded: boolean;
  conversationsHaveUnread: boolean;
  hasUnreadHint: boolean;
  hintCreatedAt: number | null;
  conversationsUpdatedAt: number;
}) {
  return conversationsLoaded
    && !conversationsHaveUnread
    && hasUnreadHint
    && hintCreatedAt !== null
    && conversationsUpdatedAt >= hintCreatedAt;
}
