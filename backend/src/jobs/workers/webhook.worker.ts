import { Worker, type Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import { env } from '../../config/env.js';
import { db } from '../../config/database.js';
import { webhookSubscriptions, webhookEvents } from '../../db/schema/webhooks.js';

interface WebhookJobData {
  eventId: string;
  subscriptionId: string;
  url: string;
  secret: string;
  eventType: string;
  payload: Record<string, unknown>;
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

async function processWebhook(job: Job<WebhookJobData>) {
  const { eventId, subscriptionId, url, secret, eventType, payload } = job.data;

  const body = JSON.stringify({
    id: eventId,
    type: eventType,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const signature = signPayload(body, secret);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gasp-Signature': `sha256=${signature}`,
      'X-Gasp-Event': eventType,
      'X-Gasp-Delivery': eventId,
    },
    body,
    signal: AbortSignal.timeout(10_000), // 10 second timeout
  });

  if (!response.ok) {
    // Update attempt count
    await db.update(webhookEvents)
      .set({
        attempts: job.attemptsMade + 1,
        lastAttemptAt: new Date(),
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      })
      .where(eq(webhookEvents.id, eventId));

    throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
  }

  // Mark as delivered
  await db.update(webhookEvents)
    .set({
      status: 'delivered',
      deliveredAt: new Date(),
      attempts: job.attemptsMade + 1,
      lastAttemptAt: new Date(),
    })
    .where(eq(webhookEvents.id, eventId));

  return { status: response.status };
}

export function startWebhookWorker() {
  const worker = new Worker('webhooks', processWebhook, {
    connection: { url: env.REDIS_URL },
    concurrency: 5,
  });

  worker.on('failed', async (job, err) => {
    console.error(`Webhook job ${job?.id} failed:`, err.message);

    // After all retries exhausted, disable the subscription
    if (job && job.attemptsMade >= 5) {
      const { subscriptionId, eventId } = job.data as WebhookJobData;
      await db.update(webhookSubscriptions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(webhookSubscriptions.id, subscriptionId));

      await db.update(webhookEvents)
        .set({ status: 'failed', errorMessage: 'Max retries exceeded. Subscription disabled.' })
        .where(eq(webhookEvents.id, eventId));

      console.warn(`Webhook subscription ${subscriptionId} disabled after 5 failed deliveries`);
    }
  });

  return worker;
}
