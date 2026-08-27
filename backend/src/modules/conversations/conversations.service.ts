import { eq, and, desc, sql, lt, inArray } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { conversations, conversationParticipants } from '../../db/schema/conversations.js';
import { messages } from '../../db/schema/messages.js';
import { users } from '../../db/schema/users.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { decodeCursor, encodeCursor } from '../../shared/pagination.js';
import { assertUsersCanInteract, assertUsersCanView, getBlockedUserIds } from '../safety/safety.service.js';

export async function listConversations(userId: string, cursor?: string, limit = 20) {
  let cursorCondition = sql`1 = 1`;
  if (cursor) {
    const cursorDate = decodeCursor(cursor);
    cursorCondition = lt(conversations.updatedAt, cursorDate);
  }

  const blockedUserIds = await getBlockedUserIds(userId);
  const blockedParticipantsCondition = blockedUserIds.length > 0
    ? sql`NOT EXISTS (
      SELECT 1
      FROM conversation_participants AS safety_participant
      WHERE safety_participant.conversation_id = ${conversations.id}
        AND safety_participant.user_id IN (${sql.join(blockedUserIds.map((id) => sql`${id}`), sql`, `)})
    )`
    : sql`1 = 1`;

  // Get conversations where user is a participant and no blocked participant
  // can be surfaced. This applies before pagination, preserving its contract.
  const userConversations = await db.select({
    conversation: conversations,
    participant: conversationParticipants,
  })
    .from(conversationParticipants)
    .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
    .where(
      and(
        eq(conversationParticipants.userId, userId),
        cursorCondition,
        blockedParticipantsCondition,
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(limit + 1);

  const hasMore = userConversations.length > limit;
  const items = hasMore ? userConversations.slice(0, limit) : userConversations;

  // Batch load participants and last messages (avoids N+1)
  const conversationIds = items.map(({ conversation }) => conversation.id);

  // 1. Batch load ALL participants for these conversations in ONE query
  const allParticipants = conversationIds.length > 0
    ? await db.select({
        conversationId: conversationParticipants.conversationId,
        userId: conversationParticipants.userId,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
        .from(conversationParticipants)
        .innerJoin(users, eq(users.id, conversationParticipants.userId))
        .where(inArray(conversationParticipants.conversationId, conversationIds))
    : [];

  // Group participants by conversation
  const participantsByConv = new Map<string, typeof allParticipants>();
  for (const p of allParticipants) {
    const list = participantsByConv.get(p.conversationId) ?? [];
    list.push(p);
    participantsByConv.set(p.conversationId, list);
  }

  // 2. Batch load last message per conversation in ONE query using DISTINCT ON
  // Passes conversationIds as a proper Postgres array literal to avoid the
  // "op ANY/ALL requires array on right side" error from raw JS array interpolation.
  const allLastMessages = conversationIds.length > 0
    ? await db.execute<{
        id: string;
        conversation_id: string;
        sender_id: string;
        content: string;
        type: string;
        media_url: string | null;
        reply_to_id: string | null;
        read_at: Date | null;
        created_at: Date;
      }>(sql`
        SELECT DISTINCT ON (conversation_id) *
        FROM messages
        WHERE conversation_id = ANY(ARRAY[${sql.join(conversationIds.map((id) => sql`${id}`), sql`, `)}]::text[])
        ORDER BY conversation_id, created_at DESC
      `)
    : [];

  // Index last messages by conversation
  const lastMessageByConv = new Map<string, {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: string;
    mediaUrl: string | null;
    replyToId: string | null;
    readAt: Date | null;
    createdAt: Date;
  }>();
  for (const m of allLastMessages) {
    lastMessageByConv.set(m.conversation_id, {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      content: m.content,
      type: m.type,
      mediaUrl: m.media_url,
      replyToId: m.reply_to_id,
      readAt: m.read_at,
      createdAt: m.created_at,
    });
  }

  // 3. Map results back to conversations
  const enriched = items.map(({ conversation, participant }) => {
    const participants = (participantsByConv.get(conversation.id) ?? []).map(
      ({ conversationId: _, ...rest }) => rest,
    );
    return {
      ...conversation,
      unreadCount: participant.unreadCount,
      lastReadAt: participant.lastReadAt,
      participants,
      lastMessage: lastMessageByConv.get(conversation.id) ?? null,
    };
  });

  const lastItem = items[items.length - 1];
  return {
    data: enriched,
    nextCursor: hasMore && lastItem ? encodeCursor(lastItem.conversation.updatedAt) : null,
    hasMore,
  };
}

export async function getOrCreateConversation(userId: string, participantId: string) {
  // Check if user exists
  const participant = await db.query.users.findFirst({
    where: eq(users.id, participantId),
  });

  if (!participant) throw new NotFoundError('User');
  await assertUsersCanInteract(userId, participantId);

  // Find existing 1-on-1 conversations, ordered by the latest activity
  // to smoothly handle any duplicates created by earlier bugs
  const existingConvs = await db.select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
    .where(eq(conversationParticipants.userId, userId))
    .orderBy(desc(conversations.updatedAt));

  for (const { conversationId } of existingConvs) {
    const otherParticipant = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, participantId),
      ),
    });

    if (otherParticipant) {
      // Check that it's a 1-on-1 (only 2 participants)
      const count = await db.select({ count: sql<number>`count(*)` })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conversationId));

      if (Number(count[0]?.count) === 2) {
        return getConversationById(conversationId, userId);
      }
    }
  }

  // Create new conversation (wrapped in transaction for atomicity)
  const newConv = await db.transaction(async (tx) => {
    const [conversation] = await tx.insert(conversations).values({}).returning();
    await tx.insert(conversationParticipants).values([
      { conversationId: conversation!.id, userId },
      { conversationId: conversation!.id, userId: participantId },
    ]);
    return conversation!;
  });

  return getConversationById(newConv.id, userId);
}

export async function getConversationById(conversationId: string, userId: string) {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  if (!conversation) throw new NotFoundError('Conversation');

  // Verify user is a participant
  const isParticipant = await db.query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, userId),
    ),
  });

  if (!isParticipant) throw new ForbiddenError('Not a participant');

  await assertConversationCanBeViewed(conversationId, userId);

  const participants = await db.select({
    userId: conversationParticipants.userId,
    displayName: users.displayName,
    username: users.username,
    avatarUrl: users.avatarUrl,
    unreadCount: conversationParticipants.unreadCount,
  })
    .from(conversationParticipants)
    .innerJoin(users, eq(users.id, conversationParticipants.userId))
    .where(eq(conversationParticipants.conversationId, conversationId));

  const [lastMessage] = await db.select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  return {
    ...conversation,
    unreadCount: isParticipant.unreadCount,
    participants,
    lastMessage: lastMessage ?? null,
  };
}

async function getOtherParticipantIds(conversationId: string, userId: string) {
  const participants = await db.select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
  return participants.map((participant) => participant.userId).filter((participantId) => participantId !== userId);
}

export async function assertConversationCanBeViewed(conversationId: string, userId: string) {
  const otherParticipantIds = await getOtherParticipantIds(conversationId, userId);
  await Promise.all(otherParticipantIds.map((participantId) => assertUsersCanView(userId, participantId)));
}

export async function assertConversationCanBeUsedForInteraction(conversationId: string, userId: string) {
  const otherParticipantIds = await getOtherParticipantIds(conversationId, userId);
  await Promise.all(otherParticipantIds.map((participantId) => assertUsersCanInteract(userId, participantId)));
}
