import { refreshToken } from '@/services/api/auth';
import type { Message } from '@/services/api/schemas/chat.schema';
import type { ApiReaction, Gasp } from '@/services/api/schemas/gasp.schema';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gasp-backend-production.up.railway.app';

let socket: Socket | null = null;

// ── Event buffer ───────────────────────────────────────────────────

interface BufferedEvent {
  event: string;
  data: unknown;
}

const eventBuffer: BufferedEvent[] = [];
const MAX_BUFFER_SIZE = 50;

function bufferedEmit(event: string, data: unknown) {
  if (socket?.connected) {
    socket.emit(event, data);
  } else if (eventBuffer.length < MAX_BUFFER_SIZE) {
    eventBuffer.push({ event, data });
  }
}

// ── Connection management ──────────────────────────────────────────

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(API_URL, {
    auth: { token },
    extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });

  socket.on('connect', () => {
    // Flush buffered events
    while (eventBuffer.length > 0) {
      const item = eventBuffer.shift()!;
      socket?.emit(item.event, item.data);
    }
    if (__DEV__) {
      console.tronLog?.log('socket | connected', { id: socket?.id });
      console.log('[socket] connected:', socket?.id);
    }
  });

  socket.on('disconnect', (reason) => {
    if (__DEV__) {
      console.tronLog?.warn('socket | disconnected', { reason });
      console.log('[socket] disconnected:', reason);
    }
  });

  socket.on('connect_error', async (err) => {
    if (__DEV__) {
      console.tronLog?.error('socket | connect_error', { message: err.message });
      console.warn('[socket] connect error:', err.message);
    }

    // Detect expired/invalid token errors
    const isTokenError = err.message.includes('jwt') ||
      err.message.includes('token') ||
      err.message.includes('unauthorized') ||
      err.message.includes('Unauthorized');

    if (isTokenError) {
      try {
        const response = await refreshToken();
        if (response.token) {
          const { setAuthToken } = await import('@/utils/storage');
          const { setApiToken } = await import('@/services/api');
          await setAuthToken(response.token);
          setApiToken(response.token);
          if (socket) {
            socket.auth = { token: response.token };
            socket.connect();
          }
        }
      } catch {
        // Refresh failed — auth interceptor will handle logout
      }
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

/** Subscribes to reconnects without exposing the socket singleton to screens. */
export function onSocketConnect(handler: () => void) {
  socket?.on('connect', handler);
  return () => { socket?.off('connect', handler); };
}

// ── Notification app-state events ─────────────────────────────────

export function sendNotificationAppState(data: {
  state: 'active' | 'inactive' | 'background';
  activeConversationId?: string | null;
}) {
  bufferedEmit('notification:app_state', data);
}

// ── Chat events ────────────────────────────────────────────────────

export interface ChatNewMessage {
  message: Message;
  conversationId: string;
  actorName?: string;
  actorAvatarUrl?: string;
}

export interface ChatTyping {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ChatMessageRead {
  conversationId: string;
  userId: string;
  readAt: string;
}

export interface ChatConversationUpdated {
  conversationId: string;
  lastMessage: Message;
}

export function chatSendMessage(data: {
  conversationId: string;
  content: string;
  type?: string;
  mediaUrl?: string;
  replyToId?: string;
}) {
  bufferedEmit('chat:send_message', data);
}

export function chatStartTyping(conversationId: string) {
  bufferedEmit('chat:typing_start', { conversationId });
}

export function chatStopTyping(conversationId: string) {
  bufferedEmit('chat:typing_stop', { conversationId });
}

export function chatMarkRead(conversationId: string, messageId?: string) {
  bufferedEmit('chat:mark_read', { conversationId, messageId });
}

export function chatJoinConversation(conversationId: string) {
  bufferedEmit('chat:join_conversation', conversationId);
}

export function chatLeaveConversation(conversationId: string) {
  bufferedEmit('chat:leave_conversation', conversationId);
}

// ── Presence events ────────────────────────────────────────────────

export interface PresenceStatus {
  userId: string;
  lastSeenAt: string;
}

export interface PresenceBulkStatus {
  statuses: Array<{ userId: string; status: 'online' }>;
}

// ── Gasp events (server → client) ─────────────────────────────────

export interface GaspReceived {
  gasp: Gasp;
}

export interface GaspViewed {
  gaspId: string;
  viewedAt: string;
}

export interface GaspReactionReceived {
  reaction: ApiReaction;
  gaspId: string;
  conversationId?: string;
  reactionMessageId?: string;
  actorName?: string;
  actorAvatarUrl?: string;
}

export interface NotificationEvent {
  kind: 'message.new' | 'gasp.received' | 'gasp.reaction_received' | 'friend.request' | 'friend.accepted';
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

export interface GaspExpired {
  gaspId: string;
}

export interface GaspStatusUpdated {
  gaspId: string;
  deliveryStatus: 'sent' | 'delivered' | 'opened';
}

// ── Generic listener helpers ───────────────────────────────────────

type EventHandler<T> = (data: T) => void;

export function onChatNewMessage(handler: EventHandler<ChatNewMessage>) {
  const wrappedHandler = (data: ChatNewMessage) => {
    if (__DEV__) console.tronLog?.debug('socket ◀ chat:new_message', { conversationId: data.conversationId, messageId: data.message.id });
    handler(data);
  };
  socket?.on('chat:new_message', wrappedHandler);
  return () => { socket?.off('chat:new_message', wrappedHandler); };
}

export function onChatConversationUpdated(handler: EventHandler<ChatConversationUpdated>) {
  socket?.on('chat:conversation_updated', handler);
  return () => { socket?.off('chat:conversation_updated', handler); };
}

export function onChatTyping(handler: EventHandler<ChatTyping>) {
  socket?.on('chat:typing', handler);
  return () => { socket?.off('chat:typing', handler); };
}

export function onChatMessageRead(handler: EventHandler<ChatMessageRead>) {
  socket?.on('chat:message_read', handler);
  return () => { socket?.off('chat:message_read', handler); };
}

export function onPresenceUserOnline(handler: EventHandler<PresenceStatus>) {
  socket?.on('presence:user_online', handler);
  return () => { socket?.off('presence:user_online', handler); };
}

export function onPresenceUserOffline(handler: EventHandler<PresenceStatus>) {
  socket?.on('presence:user_offline', handler);
  return () => { socket?.off('presence:user_offline', handler); };
}

export function onPresenceBulkStatus(handler: EventHandler<PresenceBulkStatus>) {
  socket?.on('presence:bulk_status', handler);
  return () => { socket?.off('presence:bulk_status', handler); };
}

export function onGaspReceived(handler: EventHandler<GaspReceived>) {
  const wrappedHandler = (data: GaspReceived) => {
    if (__DEV__) console.tronLog?.log('socket ◀ gasp:received', { gaspId: data.gasp.id, from: data.gasp.senderId });
    handler(data);
  };
  socket?.on('gasp:received', wrappedHandler);
  return () => { socket?.off('gasp:received', wrappedHandler); };
}

export function onGaspViewed(handler: EventHandler<GaspViewed>) {
  const wrappedHandler = (data: GaspViewed) => {
    if (__DEV__) console.tronLog?.debug('socket ◀ gasp:viewed', { gaspId: data.gaspId });
    handler(data);
  };
  socket?.on('gasp:viewed', wrappedHandler);
  return () => { socket?.off('gasp:viewed', wrappedHandler); };
}

export function onGaspReactionReceived(handler: EventHandler<GaspReactionReceived>) {
  const wrappedHandler = (data: GaspReactionReceived) => {
    if (__DEV__) console.tronLog?.log('socket ◀ gasp:reaction_received', { gaspId: data.gaspId, reactionId: data.reaction.id });
    handler(data);
  };
  socket?.on('gasp:reaction_received', wrappedHandler);
  return () => { socket?.off('gasp:reaction_received', wrappedHandler); };
}

export function onNotificationEvent(handler: EventHandler<NotificationEvent>) {
  const wrappedHandler = (data: NotificationEvent) => {
    if (__DEV__) console.tronLog?.log('socket ◀ notification:event', { kind: data.kind, eventId: data.eventId });
    handler(data);
  };
  socket?.on('notification:event', wrappedHandler);
  return () => { socket?.off('notification:event', wrappedHandler); };
}

export function onGaspExpired(handler: EventHandler<GaspExpired>) {
  socket?.on('gasp:expired', handler);
  return () => { socket?.off('gasp:expired', handler); };
}

export function onGaspStatusUpdated(handler: EventHandler<GaspStatusUpdated>) {
  const wrappedHandler = (data: GaspStatusUpdated) => {
    if (__DEV__) console.tronLog?.debug('socket ◀ gasp:status_updated', { gaspId: data.gaspId, status: data.deliveryStatus });
    handler(data);
  };
  socket?.on('gasp:status_updated', wrappedHandler);
  return () => { socket?.off('gasp:status_updated', wrappedHandler); };
}
