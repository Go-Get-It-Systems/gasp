import * as Sentry from '@sentry/react-native';

export type NotificationType =
  | 'message.new'
  | 'gasp.received'
  | 'gasp.reaction_received'
  | 'friend.request'
  | 'friend.accepted';

export type LegacyNotificationType = 'gasp' | 'message' | 'reaction' | 'reminder';

export interface NotificationRoutePayload {
  kind?: NotificationType;
  type?: NotificationType | LegacyNotificationType;
  gaspId?: string;
  conversationId?: string;
  reactionId?: string;
  reactionMessageId?: string;
  actorName?: string;
  actorAvatarUrl?: string;
  senderName?: string;
  route?: string;
}

export const NOTIFICATION_FALLBACK_ROUTE = '/(tabs)/inbox';

/** Only the locally known business profile route is accepted from server payloads. */
export function resolveBusinessNotificationRoute(route?: string): string | null {
  if (!route || !route.startsWith('/(modals)/business-profile?')) return null;
  const search = new URLSearchParams(route.slice(route.indexOf('?') + 1));
  const handle = search.get('handle');
  const campaignId = search.get('campaignId');
  if (!handle || !/^[a-zA-Z0-9_-]{1,30}$/.test(handle) || !campaignId || !/^[a-zA-Z0-9_-]{1,128}$/.test(campaignId)) return null;
  if (Array.from(search.keys()).some((key) => key !== 'handle' && key !== 'campaignId') || search.getAll('handle').length !== 1 || search.getAll('campaignId').length !== 1) return null;
  return appendQueryParams('/(modals)/business-profile', { handle, campaignId });
}

function appendQueryParams(route: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `${route}?${query}` : route;
}

function fallback(message: string, payload: NotificationRoutePayload) {
  Sentry.captureMessage(message, { level: 'warning', extra: { payload } });
  return NOTIFICATION_FALLBACK_ROUTE;
}

/** Resolves the single route contract shared by push and foreground notifications. */
export function resolveNotificationRoute(payload: NotificationRoutePayload): string {
  const kind = payload.kind ?? payload.type;
  if (kind === 'gasp.received' && payload.route) {
    const business = resolveBusinessNotificationRoute(payload.route);
    if (business) return business;
    if (payload.route.includes('business-profile')) return fallback('resolveNotificationRoute: invalid business route', payload);
  }

  switch (kind) {
    case 'gasp.received':
    case 'gasp':
    case 'reminder':
      return payload.gaspId
        ? `/(modals)/view-gasp?gaspId=${payload.gaspId}`
        : fallback(`resolveNotificationRoute: missing gaspId for ${kind}`, payload);

    case 'message.new':
    case 'message':
      return payload.conversationId
        ? appendQueryParams(`/chat/${payload.conversationId}`, {
          name: payload.actorName ?? payload.senderName,
          avatarUrl: payload.actorAvatarUrl,
        })
        : fallback(`resolveNotificationRoute: missing conversationId for ${kind}`, payload);

    case 'gasp.reaction_received':
      return payload.conversationId
        ? appendQueryParams(`/chat/${payload.conversationId}`, {
          highlightMessageId: payload.reactionMessageId,
          name: payload.actorName ?? payload.senderName,
          avatarUrl: payload.actorAvatarUrl,
        })
        : fallback('resolveNotificationRoute: missing conversationId for gasp.reaction_received', payload);

    // Backward compatibility for old reaction payloads that may still be delivered.
    case 'reaction':
      if (payload.gaspId) return `/(modals)/reaction-result?gaspId=${payload.gaspId}`;
      if (payload.reactionId) return `/(modals)/reaction-result?reactionId=${payload.reactionId}`;
      return fallback('resolveNotificationRoute: missing reaction identifiers', payload);

    case 'friend.request':
      return '/(tabs)/inbox';

    case 'friend.accepted':
      return '/(tabs)/chat';

    default:
      return fallback('resolveNotificationRoute: unknown notification kind', payload);
  }
}
