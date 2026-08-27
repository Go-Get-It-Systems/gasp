import { notificationQueue } from '../../jobs/queue.js';
import { getIO } from '../../socket/index.js';
import { isUserOnline, shouldSuppressPushForUser } from '../../socket/presence.gateway.js';
import type { NotificationEvent } from '../../shared/types.js';

interface MessageNotificationParams {
  recipientId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  messagePreview: string;
  conversationId: string;
  eventId?: string;
}

interface GaspNotificationParams {
  recipientId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  gaspId: string;
  eventId?: string;
}

interface ReactionNotificationParams extends GaspNotificationParams {
  conversationId: string;
  reactionId: string;
  reactionMessageId: string;
}

interface FriendNotificationParams {
  recipientId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  eventId?: string;
}

function trimBody(body: string) {
  return body.length > 100 ? `${body.slice(0, 97)}...` : body;
}

export function shouldNotifyAsMessage(messageType: string) {
  return messageType === 'text' || messageType === 'image';
}

export function buildMessageNotification(params: MessageNotificationParams): NotificationEvent {
  return {
    kind: 'message.new',
    recipientId: params.recipientId,
    actorId: params.actorId,
    actorName: params.actorName,
    ...(params.actorAvatarUrl && { actorAvatarUrl: params.actorAvatarUrl }),
    title: params.actorName,
    body: trimBody(params.messagePreview),
    route: `/chat/${params.conversationId}`,
    conversationId: params.conversationId,
    eventId: params.eventId,
  };
}

export function buildGaspReceivedNotification(params: GaspNotificationParams): NotificationEvent {
  return {
    kind: 'gasp.received',
    recipientId: params.recipientId,
    actorId: params.actorId,
    actorName: params.actorName,
    ...(params.actorAvatarUrl && { actorAvatarUrl: params.actorAvatarUrl }),
    title: params.actorName,
    body: 'sent you a gasp',
    route: `/(modals)/view-gasp?gaspId=${params.gaspId}`,
    gaspId: params.gaspId,
    eventId: params.eventId,
  };
}

export function buildReactionReceivedNotification(params: ReactionNotificationParams): NotificationEvent {
  return {
    kind: 'gasp.reaction_received',
    recipientId: params.recipientId,
    actorId: params.actorId,
    actorName: params.actorName,
    ...(params.actorAvatarUrl && { actorAvatarUrl: params.actorAvatarUrl }),
    title: params.actorName,
    body: 'reacted to your gasp',
    route: `/chat/${params.conversationId}`,
    conversationId: params.conversationId,
    gaspId: params.gaspId,
    reactionId: params.reactionId,
    reactionMessageId: params.reactionMessageId,
    eventId: params.eventId,
  };
}

export function buildFriendRequestNotification(params: FriendNotificationParams): NotificationEvent {
  return {
    kind: 'friend.request',
    recipientId: params.recipientId,
    actorId: params.actorId,
    actorName: params.actorName,
    ...(params.actorAvatarUrl && { actorAvatarUrl: params.actorAvatarUrl }),
    title: params.actorName,
    body: 'sent you a friend request',
    route: '/(tabs)/inbox',
    eventId: params.eventId,
  };
}

export function buildFriendAcceptedNotification(params: FriendNotificationParams): NotificationEvent {
  return {
    kind: 'friend.accepted',
    recipientId: params.recipientId,
    actorId: params.actorId,
    actorName: params.actorName,
    ...(params.actorAvatarUrl && { actorAvatarUrl: params.actorAvatarUrl }),
    title: params.actorName,
    body: 'accepted your friend request',
    route: '/(tabs)/chat',
    eventId: params.eventId,
  };
}

export async function enqueuePushNotification(event: NotificationEvent) {
  await notificationQueue.add('send', event);
}

export async function deliverNotification(event: NotificationEvent) {
  try {
    const online = await isUserOnline(event.recipientId);
    let socketDelivered = false;

    if (online) {
      getIO().to(`user:${event.recipientId}`).emit('notification:event', event);
      socketDelivered = true;
    }

    if (await shouldSuppressPushForUser(event.recipientId)) {
      return { delivered: true as const, channel: 'socket' as const };
    }

    await enqueuePushNotification(event);
    return {
      delivered: true as const,
      channel: socketDelivered ? 'socket+push' as const : 'push' as const,
    };
  } catch (error) {
    console.error('[notifications] delivery failed', {
      kind: event.kind,
      recipientId: event.recipientId,
      conversationId: event.conversationId,
      gaspId: event.gaspId,
      reactionMessageId: event.reactionMessageId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { delivered: false as const, reason: 'delivery_failed' as const };
  }
}

export async function notifyNewMessage(
  recipientId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string,
  actorId = '',
  eventId?: string,
  actorAvatarUrl?: string,
) {
  return deliverNotification(buildMessageNotification({
    recipientId,
    actorId,
    actorName: senderName,
    actorAvatarUrl,
    messagePreview,
    conversationId,
    eventId,
  }));
}

export async function notifyGaspReceived(
  recipientId: string,
  senderName: string,
  gaspId: string,
  actorId = '',
  actorAvatarUrl?: string,
) {
  return deliverNotification(buildGaspReceivedNotification({
    recipientId,
    actorId,
    actorName: senderName,
    actorAvatarUrl,
    gaspId,
    eventId: gaspId,
  }));
}

export async function notifyReactionReceived(
  recipientId: string,
  reactorName: string,
  gaspId: string,
  actorId = '',
  reactionId?: string,
  conversationId?: string,
  reactionMessageId?: string,
  actorAvatarUrl?: string,
) {
  if (!conversationId || !reactionId || !reactionMessageId) {
    console.error('[notifications] missing reaction notification route identifiers', { gaspId, reactionId, conversationId, reactionMessageId });
    return { delivered: false as const, reason: 'delivery_failed' as const };
  }
  return deliverNotification(buildReactionReceivedNotification({
    recipientId,
    actorId,
    actorName: reactorName,
    actorAvatarUrl,
    gaspId,
    conversationId,
    reactionId,
    reactionMessageId,
    eventId: reactionId,
  }));
}

export async function notifyFriendRequest(
  recipientId: string,
  requesterName: string,
  actorId = '',
  eventId?: string,
  actorAvatarUrl?: string,
) {
  return deliverNotification(buildFriendRequestNotification({
    recipientId,
    actorId,
    actorName: requesterName,
    actorAvatarUrl,
    eventId,
  }));
}

export async function notifyFriendAccepted(
  recipientId: string,
  accepterName: string,
  actorId = '',
  eventId?: string,
  actorAvatarUrl?: string,
) {
  return deliverNotification(buildFriendAcceptedNotification({
    recipientId,
    actorId,
    actorName: accepterName,
    actorAvatarUrl,
    eventId,
  }));
}
