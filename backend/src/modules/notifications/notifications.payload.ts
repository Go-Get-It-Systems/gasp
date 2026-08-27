import type { NotificationEvent } from '../../shared/types.js';

export function notificationData(event: NotificationEvent): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      kind: event.kind,
      route: event.route,
      recipientId: event.recipientId,
      actorId: event.actorId,
      actorName: event.actorName,
      actorAvatarUrl: event.actorAvatarUrl,
      conversationId: event.conversationId,
      gaspId: event.gaspId,
      reactionId: event.reactionId,
      reactionMessageId: event.reactionMessageId,
      eventId: event.eventId,
    }).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0),
  );
}
