import type { Conversation, Message } from '@/services/api/schemas/chat.schema';

export interface ConversationParticipant {
  id?: string;
  name: string;
  avatarUrl: string | null;
}

export type ConversationPreview =
  | { kind: 'text'; text: string }
  | { kind: 'translation'; key: 'chat.inbox.sentGasp' | 'chat.inbox.reactedToGasp' | 'chat.inbox.sentPhoto' | 'chat.inbox.startConversation' };

/** Resolves the person other than the signed-in user for a direct conversation. */
export function getConversationParticipant(
  conversation: Conversation,
  currentUserId?: string,
): ConversationParticipant {
  const participantIndex = conversation.participantIds.findIndex(
    (participantId) => participantId !== currentUserId,
  );

  if (participantIndex < 0) {
    return { name: 'Chat', avatarUrl: null };
  }

  return {
    id: conversation.participantIds[participantIndex],
    name: conversation.participantNames[participantIndex] || 'Chat',
    avatarUrl: conversation.participantAvatars[participantIndex] ?? null,
  };
}

/** Returns safe, media-free copy for the latest conversation activity. */
export function getConversationPreview(message?: Message): ConversationPreview {
  if (!message) return { kind: 'translation', key: 'chat.inbox.startConversation' };

  switch (message.type) {
    case 'gasp':
      return { kind: 'translation', key: 'chat.inbox.sentGasp' };
    case 'reaction':
      return { kind: 'translation', key: 'chat.inbox.reactedToGasp' };
    case 'image':
      return { kind: 'translation', key: 'chat.inbox.sentPhoto' };
    case 'text':
    default:
      return { kind: 'text', text: message.content };
  }
}

/** Formats a compact, locale-neutral activity time for a dense mobile row. */
export function formatConversationTime(value: string | undefined, now = Date.now()): string {
  if (!value) return '';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';

  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < 60_000) return 'now';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  return `${Math.floor(elapsed / 86_400_000)}d`;
}

/** Orders conversations by activity and filters them by the other participant's name. */
export function filterConversations(
  conversations: Conversation[],
  searchQuery: string,
  currentUserId?: string,
): Conversation[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const sorted = [...conversations].sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.updatedAt;
    const bTime = b.lastMessageAt ?? b.updatedAt;
    return bTime.localeCompare(aTime);
  });

  if (!normalizedQuery) return sorted;
  return sorted.filter((conversation) =>
    getConversationParticipant(conversation, currentUserId).name.toLowerCase().includes(normalizedQuery),
  );
}
