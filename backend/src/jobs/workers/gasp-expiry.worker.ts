import { Worker, type Job } from 'bullmq';
import { eq, and, lt, or, isNotNull } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../config/database.js';
import { gasps } from '../../db/schema/gasps.js';
import { getIO } from '../../socket/index.js';
import { emitGaspExpired, emitGaspViewed } from '../../socket/gasp.gateway.js';

const REACTION_WINDOW_MS = 60_000; // 60s — fallback if client doesn't call /close-view

async function processGaspExpiry(_job: Job) {
  const now = new Date();

  // 1) Expire any pending/opened gasps past their TTL
  const expiredGasps = await db.update(gasps)
    .set({ status: 'expired' })
    .where(
      and(
        or(eq(gasps.status, 'pending'), eq(gasps.status, 'opened')),
        lt(gasps.expiresAt, now),
      ),
    )
    .returning({ id: gasps.id, recipientId: gasps.recipientId });

  if (expiredGasps.length > 0) {
    console.log(`Expired ${expiredGasps.length} gasps`);
    try {
      const io = getIO();
      for (const gasp of expiredGasps) {
        emitGaspExpired(io, gasp.recipientId, gasp.id);
      }
    } catch { /* socket might not be ready */ }
  }

  // 2) Auto-close `opened` gasps that have been open longer than REACTION_WINDOW_MS
  const cutoff = new Date(now.getTime() - REACTION_WINDOW_MS);
  const closedGasps = await db.update(gasps)
    .set({ status: 'viewed', viewedAt: now })
    .where(
      and(
        eq(gasps.status, 'opened'),
        isNotNull(gasps.openedAt),
        lt(gasps.openedAt, cutoff),
      ),
    )
    .returning({
      id: gasps.id,
      senderId: gasps.senderId,
      viewedAt: gasps.viewedAt,
    });

  if (closedGasps.length > 0) {
    console.log(`Auto-closed ${closedGasps.length} opened gasps (60s timeout)`);
    try {
      const io = getIO();
      for (const gasp of closedGasps) {
        if (gasp.viewedAt) {
          emitGaspViewed(io, gasp.senderId, gasp.id, gasp.viewedAt);
        }
      }
    } catch { /* socket might not be ready */ }
  }

  return { expired: expiredGasps.length, autoClosed: closedGasps.length };
}

export function startGaspExpiryWorker() {
  const worker = new Worker('gasp-expiry', processGaspExpiry, {
    connection: { url: env.REDIS_URL },
    concurrency: 1,
  });

  worker.on('failed', (job, err) => {
    console.error(`Gasp expiry job ${job?.id} failed:`, err.message);
  });

  return worker;
}
