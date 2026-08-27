import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { reactions } from '../../db/schema/reactions.js';
import { gasps } from '../../db/schema/gasps.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import type { CreateReactionInput } from './reactions.schemas.js';
import type { GaspStatus } from '../../shared/types.js';
import { resolveReactionStatusUpdate } from '../gasps/gasps.transitions.js';
import { assertUsersCanInteract, assertUsersCanView } from '../safety/safety.service.js';

export async function createReaction(reactorId: string, input: CreateReactionInput) {
  // Verify gasp exists
  const gasp = await db.query.gasps.findFirst({
    where: eq(gasps.id, input.gaspId),
  });

  if (!gasp) throw new NotFoundError('Gasp');
  if (gasp.recipientId !== reactorId) throw new ForbiddenError('Only the recipient can react');
  if (gasp.status === 'expired') throw new ForbiddenError('Gasp expired');
  await assertUsersCanInteract(reactorId, gasp.senderId);

  const [reaction] = await db.insert(reactions).values({
    gaspId: input.gaspId,
    reactorId,
    videoUrl: input.videoUrl,
  }).returning();

  // Atualiza status do gasp para `reacted` se estiver em estado transitório (pending/opened).
  const update = resolveReactionStatusUpdate({ status: gasp.status as GaspStatus });
  if (update.kind === 'update') {
    await db.update(gasps)
      .set({ status: 'reacted', viewedAt: gasp.viewedAt ?? new Date() })
      .where(eq(gasps.id, input.gaspId));
  }

  return reaction!;
}

export async function getGasp(gaspId: string) {
  return db.query.gasps.findFirst({
    where: eq(gasps.id, gaspId),
  });
}

export async function getReactionsForGasp(gaspId: string, userId: string) {
  // Verify gasp exists and user has access
  const gasp = await db.query.gasps.findFirst({
    where: eq(gasps.id, gaspId),
  });

  if (!gasp) throw new NotFoundError('Gasp');
  if (gasp.senderId !== userId && gasp.recipientId !== userId) {
    throw new ForbiddenError('No access to this gasp');
  }
  await assertUsersCanView(userId, gasp.senderId === userId ? gasp.recipientId : gasp.senderId);

  return db.select()
    .from(reactions)
    .where(eq(reactions.gaspId, gaspId));
}
