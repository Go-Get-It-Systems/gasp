import { z } from 'zod';

export const MessageTypeSchema = z.enum(['text', 'gasp', 'reaction', 'image']);
export type MessageType = z.infer<typeof MessageTypeSchema>;

const BaseMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  type: MessageTypeSchema,
  createdAt: z.string(),
  readAt: z.string().optional(),
  mediaUrl: z.string().optional(),
  replyToId: z.string().nullable().optional(),
});

export const MessageSchema = BaseMessageSchema.extend({
  replyToMessage: BaseMessageSchema.nullable().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

const ApiMessageSchema = BaseMessageSchema.extend({
  readAt: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
}).transform(({ readAt, mediaUrl, ...message }) => MessageSchema.parse({
  ...message,
  ...(readAt ? { readAt } : {}),
  ...(mediaUrl ? { mediaUrl } : {}),
}));

export const ConversationSchema = z.object({
  id: z.string(),
  participantIds: z.array(z.string()),
  participantNames: z.array(z.string()),
  participantAvatars: z.array(z.string().nullable()),
  lastMessage: MessageSchema.optional(),
  unreadCount: z.number(),
  updatedAt: z.string(),
  lastMessageAt: z.string().optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

const ApiConversationParticipantSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});

const ApiConversationSchema = z.object({
  id: z.string(),
  participants: z.array(ApiConversationParticipantSchema),
  lastMessage: z.union([MessageSchema, ApiMessageSchema]).nullable().optional(),
  unreadCount: z.number(),
  updatedAt: z.string(),
  lastMessageAt: z.string().optional(),
}).transform(({ participants, lastMessage, ...conversation }) => ({
  ...conversation,
  participantIds: participants.map((participant) => participant.userId),
  participantNames: participants.map((participant) => participant.displayName || participant.username),
  participantAvatars: participants.map((participant) => participant.avatarUrl),
  ...(lastMessage ? { lastMessage } : {}),
})).pipe(ConversationSchema);

/** Accepts the backend transport shape and returns the canonical frontend model. */
export const ConversationResponseSchema = z.union([ConversationSchema, ApiConversationSchema]);
