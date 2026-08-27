import { Worker, type Job } from 'bullmq';
import { lt, and, eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../config/database.js';
import { webhookEvents } from '../../db/schema/webhooks.js';
import { gasps } from '../../db/schema/gasps.js';
import { cleanupExpiredGaspStorage } from '../../services/storage-cleanup.js';

async function processCleanup(_job: Job) {
  // --- Firebase Storage cleanup (must run BEFORE DB row deletion) ---
  let storageResult = {
    gaspsProcessed: 0,
    gaspsFilesDeleted: 0,
    gaspsFilesFailed: 0,
    reactionsProcessed: 0,
    reactionsFilesDeleted: 0,
    reactionsFilesFailed: 0,
  };

  try {
    storageResult = await cleanupExpiredGaspStorage();

    if (storageResult.gaspsProcessed > 0 || storageResult.reactionsProcessed > 0) {
      console.log(
        `[storage-cleanup] Gasps: ${storageResult.gaspsFilesDeleted}/${storageResult.gaspsProcessed} files deleted` +
        (storageResult.gaspsFilesFailed > 0 ? ` (${storageResult.gaspsFilesFailed} failed)` : '') +
        ` | Reactions: ${storageResult.reactionsFilesDeleted}/${storageResult.reactionsProcessed} files deleted` +
        (storageResult.reactionsFilesFailed > 0 ? ` (${storageResult.reactionsFilesFailed} failed)` : ''),
      );
    }
  } catch (error) {
    // Storage cleanup failure should not prevent DB cleanup
    console.error('[storage-cleanup] Failed:', (error as Error).message);
  }

  // --- DB cleanup ---
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Clean old webhook events (older than 30 days)
  const deletedWebhooks = await db.delete(webhookEvents)
    .where(lt(webhookEvents.createdAt, thirtyDaysAgo))
    .returning({ id: webhookEvents.id });

  // Clean expired gasps (7 days after expiry)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const deletedGasps = await db.delete(gasps)
    .where(
      and(
        eq(gasps.status, 'expired'),
        lt(gasps.expiresAt, sevenDaysAgo),
      ),
    )
    .returning({ id: gasps.id });

  console.log(`Cleanup: removed ${deletedWebhooks.length} webhook events, ${deletedGasps.length} expired gasps`);

  return {
    webhookEventsDeleted: deletedWebhooks.length,
    gaspsDeleted: deletedGasps.length,
    storageCleanup: storageResult,
  };
}

export function startCleanupWorker() {
  const worker = new Worker('cleanup', processCleanup, {
    connection: { url: env.REDIS_URL },
    concurrency: 1,
  });

  worker.on('failed', (job, err) => {
    console.error(`Cleanup job ${job?.id} failed:`, err.message);
  });

  return worker;
}
