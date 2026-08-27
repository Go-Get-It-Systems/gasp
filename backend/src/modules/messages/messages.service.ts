import { eq, and, desc, asc, lt, gt, sql, inArray } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { messages } from '../../db/schema/messages.js';
import { conversations, conversationParticipants } from '../../db/schema/conversations.js';
import { users } from '../../db/schema/users.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../shared/errors.js';
import { decodeCursor, encodeCursor } from '../../shared/pagination.js';
import type { SendMessageInput } from './messages.schemas.js';
import {
  assertConversationCanBeUsedForInteraction,
  assertConversationCanBeViewed,
} from '../conversations/conversations.service.js';

export async function assertConversationAvailable(
  conversationId: string,
  userId: string,
  forInteraction = false,
) {
  const isParticipant = await db.query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, userId),
    ),
  });
  if (!isParticipant) throw new ForbiddenError('Not a participant');

  if (forInteraction) {
    await assertConversationCanBeUsedForInteraction(conversationId, userId);
  } else {
    await assertConversationCanBeViewed(conversationId, userId);
  }
}

export function selectMessageNotificationRecipients<T extends { userId: string }>(
  participants: T[],
  senderId: string,
): T[] {
  return participants.filter((participant) => participant.userId !== senderId);
}

export async function getConversationParticipants(conversationId: string) {
  return db.select({
    userId: conversationParticipants.userId,
    displayName: users.displayName,
  })
    .from(conversationParticipants)
    .innerJoin(users, eq(users.id, conversationParticipants.userId))
    .where(eq(conversationParticipants.conversationId, conversationId));
}

async function attachReplyToMessages<T extends { replyToId: string | null }>(items: T[]) {
  const replyToIds = [...new Set(items.map((m) => m.replyToId).filter((id): id is string => !!id))];
  if (replyToIds.length === 0) return items;

  const replyTargets = await db.select()
    .from(messages)
    .where(inArray(messages.id, replyToIds));
  const replyTargetById = new Map(replyTargets.map((m) => [m.id, m]));

  return items.map((item) => ({
    ...item,
    replyToMessage: item.replyToId ? replyTargetById.get(item.replyToId) ?? null : undefined,
  }));
}

export async function listMessages(
  conversationId: string,
  userId: string,
  cursor?: string,
  limit = 50,
  direction: 'older' | 'newer' = 'older',
) {
  await assertConversationAvailable(conversationId, userId);

  let cursorCondition = sql`1 = 1`;
  if (cursor) {
    const cursorDate = decodeCursor(cursor);
    cursorCondition = direction === 'older'
      ? lt(messages.createdAt, cursorDate)
      : gt(messages.createdAt, cursorDate);
  }

  const result = await db.select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        cursorCondition,
      ),
    )
    .orderBy(direction === 'older' ? desc(messages.createdAt) : asc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;

  const lastItem = items[items.length - 1];
  return {
    data: await attachReplyToMessages(items),
    nextCursor: hasMore && lastItem ? encodeCursor(lastItem.createdAt) : null,
    hasMore,
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: SendMessageInput,
) {
  await assertConversationAvailable(conversationId, senderId, true);

  // Validate replyToId belongs to the same conversation
  if (input.replyToId) {
    const replyTarget = await db.query.messages.findFirst({
      where: and(
        eq(messages.id, input.replyToId),
        eq(messages.conversationId, conversationId),
      ),
    });
    if (!replyTarget) throw new BadRequestError('Reply target not found in this conversation');
  }

  // Create message
  const [message] = await db.insert(messages).values({
    conversationId,
    senderId,
    content: input.content,
    type: input.type,
    mediaUrl: input.mediaUrl,
    replyToId: input.replyToId,
  }).returning();

  // Update conversation timestamp
  await db.update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // Increment unread count for other participants
  await db.update(conversationParticipants)
    .set({ unreadCount: sql`${conversationParticipants.unreadCount} + 1` })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        sql`${conversationParticipants.userId} != ${senderId}`,
      ),
    );

  return (await attachReplyToMessages([message!]))[0]!;
}

export async function getMessageNotificationRecipients(conversationId: string, senderId: string) {
  return selectMessageNotificationRecipients(
    await getConversationParticipants(conversationId),
    senderId,
  );
}

export async function markConversationRead(conversationId: string, userId: string) {
  await assertConversationAvailable(conversationId, userId);

  await db.update(conversationParticipants)
    .set({ unreadCount: 0, lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    );

  // Mark all messages as read
  await db.update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} != ${userId}`,
        sql`${messages.readAt} IS NULL`,
      ),
    );

  return { unreadCount: 0 };
}
