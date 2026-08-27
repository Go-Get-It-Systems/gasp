import { Queue } from 'bullmq';
import { env } from '../config/env.js';

// Use URL string to avoid ioredis version conflicts between our ioredis and BullMQ's bundled ioredis
const connection = { connection: { url: env.REDIS_URL } };

export const notificationQueue = new Queue('notifications', {
  ...connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5_000,
    },
  },
});
export const webhookQueue = new Queue('webhooks', {
  ...connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60_000,
    },
  },
});
export const gaspExpiryQueue = new Queue('gasp-expiry', connection);
export const cleanupQueue = new Queue('cleanup', connection);

// Schedule recurring jobs
export async function scheduleRecurringJobs() {
  // Check for expired gasps every minute
  await gaspExpiryQueue.upsertJobScheduler(
    'check-expired',
    { every: 60_000 },
    { name: 'check-expired' },
  );

  // Cleanup old webhook events daily at 3 AM
  await cleanupQueue.upsertJobScheduler(
    'cleanup-old-events',
    { pattern: '0 3 * * *' },
    { name: 'cleanup-old-events' },
  );
}
