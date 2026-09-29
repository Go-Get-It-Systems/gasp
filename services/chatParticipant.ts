import type { Conversation } from '@/services/api/schemas/chat.schema';

interface ChatParticipantContext {
  conversation?: Conversation;
  fetchedConversation?: Conversation;
  currentUserId?: string;
  currentUsername?: string;
  currentDisplayName?: string;
  routeName?: string;
  routeAvatarUrl?: string;
}

function participantFromConversation(
  conversation: Conversation | undefined,
  currentUserId?: string,
  currentUsername?: string,
  currentDisplayName?: string,
) {
  if (!conversation) return {};
  if (!Array.isArray(conversation.participantIds) || !Array.isArray(conversation.participantNames)) {
    return {};
  }

  const participantAvatars = Array.isArray(conversation.participantAvatars)
    ? conversation.participantAvatars
    : [];
  const index = conversation.participantIds.findIndex((participantId, participantIndex) =>
    participantId !== currentUserId
      && conversation.participantNames[participantIndex] !== currentUsername
      && conversation.participantNames[participantIndex] !== currentDisplayName,
  );
  return index >= 0
    ? {
        id: conversation.participantIds[index],
        name: conversation.participantNames[index],
        avatarUrl: participantAvatars[index] ?? undefined,
      }
    : {};
}

/** Keeps notification navigation from briefly rendering an unknown chat identity. */
export function resolveChatParticipant(context: ChatParticipantContext) {
  const cached = participantFromConversation(
    context.conversation,
    context.currentUserId,
    context.currentUsername,
    context.currentDisplayName,
  );
  if (cached.name) return cached;

  if (context.routeName) {
    return { name: context.routeName, avatarUrl: context.routeAvatarUrl };
  }

  const fetched = participantFromConversation(
    context.fetchedConversation,
    context.currentUserId,
    context.currentUsername,
    context.currentDisplayName,
  );
  return fetched.name ? fetched : { name: 'Chat', avatarUrl: undefined, id: undefined };
}
