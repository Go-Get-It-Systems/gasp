import { eq, and, desc, sql, or } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { gasps } from '../../db/schema/gasps.js';
import { users } from '../../db/schema/users.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { withRetry } from '../../shared/with-retry.js';
import type { SendGaspInput, BatchGaspInput } from './gasps.schemas.js';
import type { GaspStatus } from '../../shared/types.js';
import { resolveOpenTransition, resolveCloseViewTransition } from './gasps.transitions.js';
import { assertUsersCanInteract, assertUsersCanView, getBlockedUserIds } from '../safety/safety.service.js';

const GASP_TTL_HOURS = 24;

export async function sendGasp(senderId: string, input: SendGaspInput) {
  await assertUsersCanInteract(senderId, input.recipientId);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + GASP_TTL_HOURS);

  const [gasp] = await withRetry(() =>
    db.insert(gasps).values({
      senderId,
      recipientId: input.recipientId,
      imageUrl: input.imageUrl,
      mediaType: input.mediaType,
      blurhash: input.blurhash,
      textOverlay: input.textOverlay,
      replayable: input.replayable,
      expiresAt,
    }).returning(),
  );

  return gasp!;
}

export async function batchSendGasp(senderId: string, input: BatchGaspInput) {
  await Promise.all(input.recipientIds.map((recipientId) => assertUsersCanInteract(senderId, recipientId)));
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + GASP_TTL_HOURS);

  const values = input.recipientIds.map((recipientId) => ({
    senderId,
    recipientId,
    imageUrl: input.imageUrl,
    mediaType: input.mediaType,
    blurhash: input.blurhash,
    textOverlay: input.textOverlay,
    replayable: input.replayable,
    expiresAt,
  }));

  return withRetry(() => db.insert(gasps).values(values).returning());
}

export async function getPendingGasps(userId: string) {
  const blockedUserIds = await getBlockedUserIds(userId);
  return db.select({
    gasp: gasps,
    sender: {
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    },
  })
    .from(gasps)
    .innerJoin(users, eq(users.id, gasps.senderId))
    .where(
      and(
        eq(gasps.recipientId, userId),
        or(eq(gasps.status, 'pending'), eq(gasps.status, 'opened')),
        sql`${gasps.expiresAt} > NOW()`,
        blockedUserIds.length > 0 ? sql`${gasps.senderId} NOT IN (${sql.join(blockedUserIds.map((id) => sql`${id}`), sql`, `)})` : undefined,
      ),
    )
    .orderBy(desc(gasps.createdAt));
}

/**
 * Marca gasp como `opened` — inicia a janela de reação.
 * Idempotente. Permite reopen para gasps `replayable` ainda dentro do TTL.
 */
export async function openGasp(gaspId: string, userId: string) {
  const gasp = await db.query.gasps.findFirst({ where: eq(gasps.id, gaspId) });

  if (!gasp) throw new NotFoundError('Gasp');
  if (gasp.recipientId !== userId) throw new ForbiddenError('Not the recipient');
  await assertUsersCanView(userId, gasp.senderId);

  const transition = resolveOpenTransition(
    { status: gasp.status as GaspStatus, expiresAt: gasp.expiresAt, replayable: gasp.replayable },
    new Date(),
  );

  if (transition.kind === 'reject') {
    throw new ForbiddenError('Gasp expired');
  }
  if (transition.kind === 'noop') {
    return gasp;
  }

  const [updated] = await db.update(gasps)
    .set({ status: 'opened', openedAt: new Date() })
    .where(eq(gasps.id, gaspId))
    .returning();

  return updated!;
}

/**
 * Fecha a janela de reação sem reação enviada. Marca como `viewed`.
 * No-op se não estiver mais em `opened` (já reagiu, já fechou, ou expirou).
 */
export async function closeViewGasp(gaspId: string, userId: string) {
  const gasp = await db.query.gasps.findFirst({ where: eq(gasps.id, gaspId) });

  if (!gasp) throw new NotFoundError('Gasp');
  if (gasp.recipientId !== userId) throw new ForbiddenError('Not the recipient');
  await assertUsersCanView(userId, gasp.senderId);

  const transition = resolveCloseViewTransition({ status: gasp.status as GaspStatus });
  if (transition.kind === 'noop') return gasp;

  const [updated] = await db.update(gasps)
    .set({ status: 'viewed', viewedAt: new Date() })
    .where(eq(gasps.id, gaspId))
    .returning();

  return updated!;
}

/**
 * @deprecated Use openGasp + closeViewGasp. Mantido para compat com cliente antigo.
 */
export async function viewGasp(gaspId: string, userId: string) {
  const opened = await openGasp(gaspId, userId);
  if (opened.status === 'opened') {
    return closeViewGasp(gaspId, userId);
  }
  return opened;
}

export async function getSentGasps(userId: string) {
  const blockedUserIds = await getBlockedUserIds(userId);
  return db.select()
    .from(gasps)
    .where(and(
      eq(gasps.senderId, userId),
      blockedUserIds.length > 0 ? sql`${gasps.recipientId} NOT IN (${sql.join(blockedUserIds.map((id) => sql`${id}`), sql`, `)})` : undefined,
    ))
    .orderBy(desc(gasps.createdAt))
    .limit(50);
}
