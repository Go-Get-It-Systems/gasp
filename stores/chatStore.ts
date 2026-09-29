import { create } from 'zustand';
import type { MessageType } from '@/services/api/schemas/chat.schema';
import {
  chatSendMessage,
  chatStartTyping,
  chatStopTyping,
} from '@/services/socket';

interface TypingUser {
  userId: string;
  conversationId: string;
}

interface ChatState {
  activeConversationId: string | null;
  typingUsers: TypingUser[];

  setActiveConversation: (id: string | null) => void;
  setTypingUser: (conversationId: string, userId: string, isTyping: boolean) => void;
  sendMessage: (conversationId: string, content: string, type?: MessageType, mediaUrl?: string, replyToId?: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  typingUsers: [],

  setActiveConversation: (activeConversationId) =>
    set({ activeConversationId }),

  setTypingUser: (conversationId, userId, isTyping) =>
    set((state) => {
      const filtered = state.typingUsers.filter(
        (t) => !(t.conversationId === conversationId && t.userId === userId)
      );
      return {
        typingUsers: isTyping
          ? [...filtered, { conversationId, userId }]
          : filtered,
      };
    }),

  sendMessage: (conversationId, content, type = 'text', mediaUrl, replyToId) => {
    chatSendMessage({ conversationId, content, type, mediaUrl, replyToId });
  },

  startTyping: (conversationId) => {
    chatStartTyping(conversationId);
  },

  stopTyping: (conversationId) => {
    chatStopTyping(conversationId);
  },
}));
