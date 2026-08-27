import { describe, expect, test } from 'vitest';
import { notificationData } from './notifications.payload.js';

describe('notificationData', () => {
  test('serializes the chat-first reaction routing identifiers as strings', () => {
    expect(notificationData({
      kind: 'gasp.reaction_received',
      recipientId: 'recipient-1',
      actorId: 'actor-1',
      actorName: 'Alex',
      title: 'Alex',
      body: 'reacted to your gasp',
      route: '/chat/conv-1',
      conversationId: 'conv-1',
      gaspId: 'gasp-1',
      reactionId: 'reaction-1',
      reactionMessageId: 'message-1',
      eventId: 'reaction-1',
    })).toMatchObject({
      conversationId: 'conv-1',
      gaspId: 'gasp-1',
      reactionId: 'reaction-1',
      reactionMessageId: 'message-1',
    });
  });

  test('omits absent optional values', () => {
    const data = notificationData({
      kind: 'friend.request',
      recipientId: 'recipient-1',
      actorId: 'actor-1',
      actorName: 'Alex',
      title: 'Alex',
      body: 'sent you a friend request',
      route: '/(tabs)/inbox',
    });

    expect(data).not.toHaveProperty('reactionMessageId');
    expect(data).not.toHaveProperty('actorAvatarUrl');
  });
});
