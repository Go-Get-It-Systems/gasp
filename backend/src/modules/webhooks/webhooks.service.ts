import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '../../config/database.js';
import { webhookSubscriptions, webhookEvents } from '../../db/schema/webhooks.js';
import { webhookQueue } from '../../jobs/queue.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import type { CreateWebhookInput, UpdateWebhookInput } from './webhooks.schemas.js';
import type { WebhookEventType } from '../../shared/types.js';

export async function createSubscription(userId: string, input: CreateWebhookInput) {
  const secret = randomBytes(32).toString('hex');

  const [subscription] = await db.insert(webhookSubscriptions).values({
    userId,
    url: input.url,
    secret,
    events: input.events,
    description: input.description,
  }).returning();

  return { ...subscription!, secret };
}

export async function listSubscriptions(userId: string) {
  return db.select({
    id: webhookSubscriptions.id,
    url: webhookSubscriptions.url,
    events: webhookSubscriptions.events,
    isActive: webhookSubscriptions.isActive,
    description: webhookSubscriptions.description,
    createdAt: webhookSubscriptions.createdAt,
    updatedAt: webhookSubscriptions.updatedAt,
  }).from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.userId, userId));
}

export async function updateSubscription(userId: string, id: string, input: UpdateWebhookInput) {
  const sub = await getSubscription(userId, id);
  if (sub.userId !== userId) throw new ForbiddenError('Not subscription owner');

  const [updated] = await db.update(webhookSubscriptions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(webhookSubscriptions.id, id))
    .returning();

  if (!updated) throw new NotFoundError('Webhook subscription');
  return updated;
}

export async function deleteSubscription(userId: string, id: string) {
  const sub = await getSubscription(userId, id);
  if (sub.userId !== userId) throw new ForbiddenError('Not subscription owner');

  const [deleted] = await db.delete(webhookSubscriptions)
    .where(eq(webhookSubscriptions.id, id))
    .returning();

  if (!deleted) throw new NotFoundError('Webhook subscription');
}

export async function getEventHistory(userId: string, subscriptionId: string) {
  const sub = await getSubscription(userId, subscriptionId);
  if (sub.userId !== userId) throw new ForbiddenError('Not subscription owner');

  return db.select()
    .from(webhookEvents)
    .where(eq(webhookEvents.subscriptionId, subscriptionId))
    .limit(50);
}

export async function getSubscription(userId: string, id: string) {
  const [subscription] = await db.select()
    .from(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.userId, userId)));

  if (!subscription) throw new NotFoundError('Webhook subscription');
  return subscription;
}

// Core function: emit a webhook event to all matching subscriptions
export async function emitWebhookEvent(
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
) {
  // Find active subscriptions that listen to this event type
  const subscriptions = await db.select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.isActive, true));

  const matchingSubscriptions = subscriptions.filter(
    (sub) => sub.events.includes(eventType),
  );

  for (const sub of matchingSubscriptions) {
    // Create event record
    const [event] = await db.insert(webhookEvents).values({
      subscriptionId: sub.id,
      eventType,
      payload,
    }).returning();

    // Enqueue delivery job
    await webhookQueue.add('deliver', {
      eventId: event!.id,
      subscriptionId: sub.id,
      url: sub.url,
      secret: sub.secret,
      eventType,
      payload,
    });
  }
}
