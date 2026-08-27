import { and, eq, or } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { conversationParticipants } from '../../db/schema/conversations.js';
import { friendships } from '../../db/schema/friendships.js';
import { gasps } from '../../db/schema/gasps.js';
import { messages } from '../../db/schema/messages.js';
import { reports, safetyAuditEvents, userBlocks } from '../../db/schema/safety.js';
import { users } from '../../db/schema/users.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { ReportInput, ReportTargetType } from './safety.schemas.js';

const interactionDeniedMessage = 'This interaction is unavailable';

async function recordAuditEvent(actorId: string, eventType: string, subjectUserId?: string) {
  await db.insert(safetyAuditEvents).values({ actorId, eventType, subjectUserId });
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const rows = await db.select({
    blockerId: userBlocks.blockerId,
    blockedId: userBlocks.blockedId,
  })
    .from(userBlocks)
    .where(or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, userId)));

  return rows.map((row) => row.blockerId === userId ? row.blockedId : row.blockerId);
}

export async function areUsersBlocked(firstUserId: string, secondUserId: string): Promise<boolean> {
  if (firstUserId === secondUserId) return false;

  const block = await db.query.userBlocks.findFirst({
    where: or(
      and(eq(userBlocks.blockerId, firstUserId), eq(userBlocks.blockedId, secondUserId)),
      and(eq(userBlocks.blockerId, secondUserId), eq(userBlocks.blockedId, firstUserId)),
    ),
  });

  return !!block;
}

/**
 * The shared guard for every new person-to-person interaction. The neutral
 * error intentionally never says who initiated the block.
 */
export async function assertUsersCanInteract(actorId: string, recipientId: string) {
  if (actorId === recipientId) {
    throw new BadRequestError('Cannot interact with yourself');
  }

  if (await areUsersBlocked(actorId, recipientId)) {
    await recordAuditEvent(actorId, 'interaction_denied_blocked', recipientId);
    throw new ForbiddenError(interactionDeniedMessage);
  }
}

export async function assertUsersCanView(actorId: string, subjectUserId: string) {
  if (actorId === subjectUserId) return;
  if (await areUsersBlocked(actorId, subjectUserId)) {
    await recordAuditEvent(actorId, 'view_denied_blocked', subjectUserId);
    throw new ForbiddenError('User is not available');
  }
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new BadRequestError('Cannot block yourself');

  const blockedUser = await db.query.users.findFirst({ where: eq(users.id, blockedId) });
  if (!blockedUser) throw new NotFoundError('User');

  const [block, alreadyBlocked] = await db.transaction(async (tx) => {
    const inserted = await tx.insert(userBlocks)
      .values({ blockerId, blockedId })
      .onConflictDoNothing()
      .returning();

    // Blocking severs a friendship or pending request. Unblocking does not
    // recreate it, which avoids restoring consent implicitly.
    await tx.delete(friendships).where(or(
      and(eq(friendships.requesterId, blockerId), eq(friendships.addresseeId, blockedId)),
      and(eq(friendships.requesterId, blockedId), eq(friendships.addresseeId, blockerId)),
    ));

    if (inserted[0]) return [inserted[0], false] as const;
    const existing = await tx.query.userBlocks.findFirst({
      where: and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)),
    });
    return [existing!, true] as const;
  });

  await recordAuditEvent(blockerId, 'user_blocked', blockedId);
  return { block, alreadyBlocked };
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const [removed] = await db.delete(userBlocks)
    .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
    .returning({ id: userBlocks.id });

  if (!removed) throw new NotFoundError('Blocked user');
  await recordAuditEvent(blockerId, 'user_unblocked', blockedId);
}

export async function listBlockedUsers(blockerId: string) {
  return db.select({
    id: users.id,
    displayName: users.displayName,
    username: users.username,
    avatarUrl: users.avatarUrl,
    blockedAt: userBlocks.createdAt,
  })
    .from(userBlocks)
    .innerJoin(users, eq(users.id, userBlocks.blockedId))
    .where(eq(userBlocks.blockerId, blockerId))
    .orderBy(userBlocks.createdAt);
}

async function assertReportTargetExists(reporterId: string, targetType: ReportTargetType, targetId: string) {
  if (targetType === 'profile') {
    const user = await db.query.users.findFirst({ where: eq(users.id, targetId) });
    if (!user) throw new NotFoundError('Report target');
    if (user.id === reporterId) throw new BadRequestError('Cannot report yourself');
    return;
  }

  if (targetType === 'message') {
    const message = await db.query.messages.findFirst({ where: eq(messages.id, targetId) });
    if (!message) throw new NotFoundError('Report target');
    const participant = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(conversationParticipants.conversationId, message.conversationId),
        eq(conversationParticipants.userId, reporterId),
      ),
    });
    if (!participant) throw new ForbiddenError('Cannot report this content');
    return;
  }

  const gasp = await db.query.gasps.findFirst({ where: eq(gasps.id, targetId) });
  if (!gasp) throw new NotFoundError('Report target');
  if (gasp.senderId !== reporterId && gasp.recipientId !== reporterId) {
    throw new ForbiddenError('Cannot report this content');
  }
}

export async function submitReport(reporterId: string, input: ReportInput) {
  await assertReportTargetExists(reporterId, input.targetType, input.targetId);

  try {
    const [report] = await db.insert(reports).values({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      category: input.category,
      description: input.description,
    }).returning({ id: reports.id, status: reports.status, createdAt: reports.createdAt });

    await recordAuditEvent(reporterId, `report_submitted_${input.targetType}`);
    return report!;
  } catch (error: unknown) {
    if (isUniqueViolation(error)) throw new ConflictError('This content has already been reported');
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === '23505';
}
