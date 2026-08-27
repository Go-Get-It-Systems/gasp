import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import * as conversationsApi from '@/services/api/conversations';
import * as messagesApi from '@/services/api/messages';
import type { Message, Conversation } from '@/services/api/schemas/chat.schema';
import type { PaginatedResponse } from '@/services/api/schemas/common.schema';
import { isTransientError } from './queryHelpers';

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: async () => {
      const result = await conversationsApi.listConversations();
      return result.data;
    },
    select: (conversations) =>
      [...conversations].sort((a, b) => {
        const aTime = a.lastMessageAt ?? a.updatedAt;
        const bTime = b.lastMessageAt ?? b.updatedAt;
        return bTime.localeCompare(aTime);
      }),
  });
}

export function useConversation(conversationId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(conversationId),
    queryFn: () => conversationsApi.getConversation(conversationId),
    enabled: enabled && Boolean(conversationId),
  });
}

export function useMessages(conversationId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages.byConversation(conversationId),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      return messagesApi.listMessages(conversationId, {
        cursor: pageParam,
        limit: 20,
        direction: 'older',
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<Message>) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled,
  });
}

export function flattenMessages(data: { pages: PaginatedResponse<Message>[] } | undefined): Message[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.data);
}

export function addMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: Message,
) {
  queryClient.setQueryData<{ pages: PaginatedResponse<Message>[]; pageParams: unknown[] }>(
    queryKeys.messages.byConversation(conversationId),
    (old) => {
      if (!old) return old;
      const firstPage = old.pages[0];
      if (!firstPage) return old;
      if (firstPage.data.some((m) => m.id === message.id)) return old;
      return {
        ...old,
        pages: [
          { ...firstPage, data: [message, ...firstPage.data] },
          ...old.pages.slice(1),
        ],
      };
    },
  );
}

export function useGetOrCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) =>
      conversationsApi.getOrCreateConversation(participantId),
    retry: (failureCount, error) => failureCount < 1 && isTransientError(error),
    retryDelay: 1500,
    onSuccess: (conversation) => {
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) => {
        if (!old) return [conversation];
        if (old.some((c) => c.id === conversation.id)) return old;
        return [conversation, ...old];
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => messagesApi.markRead(conversationId),
    onMutate: async (conversationId) => {
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) =>
        old?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)) ?? [],
      );
    },
  });
}
