import { hasUnreadChatActivity, shouldClearChatUnreadHint } from '../chatUnread';
import type { Conversation } from '@/services/api/schemas/chat.schema';

const conversation = { id: 'conversation-1', unreadCount: 0 } as unknown as Conversation;

describe('hasUnreadChatActivity', () => {
  it('shows immediately from the realtime hint before conversations refetch', () => {
    expect(hasUnreadChatActivity(undefined, true)).toBe(true);
  });

  it('uses authoritative unread counts and clears when both sources are clear', () => {
    expect(hasUnreadChatActivity([{ ...conversation, unreadCount: 1 }], false)).toBe(true);
    expect(hasUnreadChatActivity([conversation], false)).toBe(false);
  });

  it('only clears a realtime hint after a newer authoritative response has no unread messages', () => {
    const hintCreatedAt = 200;

    expect(shouldClearChatUnreadHint({
      conversationsLoaded: true,
      conversationsHaveUnread: false,
      hasUnreadHint: true,
      hintCreatedAt,
      conversationsUpdatedAt: 199,
    })).toBe(false);
    expect(shouldClearChatUnreadHint({
      conversationsLoaded: true,
      conversationsHaveUnread: true,
      hasUnreadHint: true,
      hintCreatedAt,
      conversationsUpdatedAt: 201,
    })).toBe(false);
    expect(shouldClearChatUnreadHint({
      conversationsLoaded: true,
      conversationsHaveUnread: false,
      hasUnreadHint: true,
      hintCreatedAt,
      conversationsUpdatedAt: 201,
    })).toBe(true);
  });
});
