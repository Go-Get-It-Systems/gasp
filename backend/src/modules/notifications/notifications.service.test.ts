import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { NotificationEvent } from '../../shared/types.js';

const queueAdd = vi.fn();
const emit = vi.fn();
const to = vi.fn(() => ({ emit }));
const isUserOnline = vi.fn();
const shouldSuppressPushForUser = vi.fn();

vi.mock('../../jobs/queue.js', () => ({
  notificationQueue: { add: queueAdd },
}));

vi.mock('../../socket/index.js', () => ({
  getIO: () => ({ to }),
}));

vi.mock('../../socket/presence.gateway.js', () => ({
  isUserOnline,
  shouldSuppressPushForUser,
}));

const service = await import('./notifications.service.js');

describe('notification payload builders', () => {
  test('only text and image chat messages use the message notification channel', () => {
    expect(service.shouldNotifyAsMessage('text')).toBe(true);
    expect(service.shouldNotifyAsMessage('image')).toBe(true);
    expect(service.shouldNotifyAsMessage('gasp')).toBe(false);
    expect(service.shouldNotifyAsMessage('reaction')).toBe(false);
  });

  test('buildMessageNotification includes canonical kind, route, and conversationId', () => {
    const event = service.buildMessageNotification({
      recipientId: 'recipient-1',
      actorId: 'sender-1',
      actorName: 'Gabriel',
      actorAvatarUrl: 'https://example.com/avatar.jpg',
      messagePreview: 'hello there',
      conversationId: 'conv-1',
      eventId: 'msg-1',
    });

    expect(event).toMatchObject({
      kind: 'message.new',
      recipientId: 'recipient-1',
      actorId: 'sender-1',
      actorName: 'Gabriel',
      actorAvatarUrl: 'https://example.com/avatar.jpg',
      title: 'Gabriel',
      body: 'hello there',
      route: '/chat/conv-1',
      conversationId: 'conv-1',
      eventId: 'msg-1',
    });
  });

  test('buildGaspReceivedNotification includes gasp route and gaspId', () => {
    const event = service.buildGaspReceivedNotification({
      recipientId: 'recipient-1',
      actorId: 'sender-1',
      actorName: 'Gabriel',
      gaspId: 'gasp-1',
      eventId: 'gasp-1',
    });

    expect(event).toMatchObject({
      kind: 'gasp.received',
      route: '/(modals)/view-gasp?gaspId=gasp-1',
      gaspId: 'gasp-1',
    });
  });

  test('buildReactionReceivedNotification includes chat-first reaction identifiers', () => {
    const event = service.buildReactionReceivedNotification({
      recipientId: 'sender-1',
      actorId: 'reactor-1',
      actorName: 'Ana',
      gaspId: 'gasp-1',
      conversationId: 'conv-1',
      reactionId: 'reaction-1',
      reactionMessageId: 'message-1',
      eventId: 'reaction-1',
    });

    expect(event).toMatchObject({
      kind: 'gasp.reaction_received',
      route: '/chat/conv-1',
      conversationId: 'conv-1',
      gaspId: 'gasp-1',
      reactionId: 'reaction-1',
      reactionMessageId: 'message-1',
      eventId: 'reaction-1',
    });
  });

  test('friend notification builders use actor-first canonical payloads', () => {
    expect(service.buildFriendRequestNotification({
      recipientId: 'recipient-1',
      actorId: 'requester-1',
      actorName: 'Sam',
    })).toMatchObject({
      kind: 'friend.request',
      route: '/(tabs)/inbox',
      body: 'sent you a friend request',
    });

    expect(service.buildFriendAcceptedNotification({
      recipientId: 'recipient-1',
      actorId: 'accepter-1',
      actorName: 'Jo',
    })).toMatchObject({
      kind: 'friend.accepted',
      route: '/(tabs)/chat',
      body: 'accepted your friend request',
    });
  });
});

describe('deliverNotification', () => {
  const event: NotificationEvent = {
    kind: 'message.new',
    recipientId: 'recipient-1',
    actorId: 'sender-1',
    actorName: 'Gabriel',
    title: 'Gabriel',
    body: 'hello',
    route: '/chat/conv-1',
    conversationId: 'conv-1',
    eventId: 'msg-1',
  };

  beforeEach(() => {
    queueAdd.mockReset();
    emit.mockClear();
    to.mockClear();
    isUserOnline.mockReset();
    shouldSuppressPushForUser.mockReset();
    shouldSuppressPushForUser.mockResolvedValue(false);
  });

  test('uses only socket delivery for foreground-active online recipients', async () => {
    isUserOnline.mockResolvedValue(true);
    shouldSuppressPushForUser.mockResolvedValue(true);

    await expect(service.deliverNotification(event)).resolves.toEqual({
      delivered: true,
      channel: 'socket',
    });

    expect(to).toHaveBeenCalledWith('user:recipient-1');
    expect(emit).toHaveBeenCalledWith('notification:event', event);
    expect(queueAdd).not.toHaveBeenCalled();
  });

  test('queues push for online recipients when app is not foreground-active', async () => {
    isUserOnline.mockResolvedValue(true);
    shouldSuppressPushForUser.mockResolvedValue(false);

    await expect(service.deliverNotification(event)).resolves.toEqual({
      delivered: true,
      channel: 'socket+push',
    });

    expect(emit).toHaveBeenCalledWith('notification:event', event);
    expect(queueAdd).toHaveBeenCalledWith('send', event);
  });

  test('uses push queue delivery for offline recipients', async () => {
    isUserOnline.mockResolvedValue(false);

    await expect(service.deliverNotification(event)).resolves.toEqual({
      delivered: true,
      channel: 'push',
    });

    expect(queueAdd).toHaveBeenCalledWith('send', event);
    expect(emit).not.toHaveBeenCalled();
  });

  test('does not throw when delivery fails', async () => {
    isUserOnline.mockRejectedValue(new Error('presence down'));

    await expect(service.deliverNotification(event)).resolves.toEqual({
      delivered: false,
      reason: 'delivery_failed',
    });
  });
});
