// Shared types that mirror the React Native app types

export type MessageType = 'text' | 'image' | 'gasp' | 'reaction';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export type GaspStatus = 'pending' | 'opened' | 'viewed' | 'reacted' | 'expired';

export type OnlineStatus = 'online' | 'offline';

export type WebhookEventType =
  | 'user.registered'
  | 'user.updated'
  | 'message.created'
  | 'gasp.sent'
  | 'gasp.viewed'
  | 'gasp.expired'
  | 'reaction.created'
  | 'friend.requested'
  | 'friend.accepted';

export type NotificationKind =
  | 'message.new'
  | 'gasp.received'
  | 'gasp.reaction_received'
  | 'friend.request'
  | 'friend.accepted';

export type NotificationType = NotificationKind;

export interface NotificationEvent {
  kind: NotificationKind;
  recipientId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  title: string;
  body: string;
  route: string;
  conversationId?: string;
  gaspId?: string;
  reactionId?: string;
  reactionMessageId?: string;
  eventId?: string;
}

export type NotificationAppVisibility = 'active' | 'inactive' | 'background';

export interface NotificationAppState {
  state: NotificationAppVisibility;
  activeConversationId?: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AuthPayload {
  userId: string;
  firebaseUid: string;
}
