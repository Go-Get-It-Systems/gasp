import { Worker, type Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../config/database.js';
import { devices } from '../../db/schema/devices.js';
import { firebaseMessaging } from '../../config/firebase.js';
import { shouldSuppressPushForUser } from '../../socket/presence.gateway.js';
import type { NotificationEvent } from '../../shared/types.js';
import { notificationData } from '../../modules/notifications/notifications.payload.js';

function isExpoPushToken(token: string) {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

async function sendExpoPushNotifications(tokens: string[], event: NotificationEvent) {
  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tokens.map((to) => ({
      to,
      title: event.title,
      body: event.body,
      sound: 'default',
      data: notificationData(event),
    }))),
  });

  if (!response.ok) {
    throw new Error(`Expo push failed with status ${response.status}`);
  }

  const result = await response.json() as {
    data?: Array<{ status?: string }>;
  };
  const receipts = result.data ?? [];
  return {
    sent: receipts.filter((receipt) => receipt.status === 'ok').length,
    failed: receipts.filter((receipt) => receipt.status && receipt.status !== 'ok').length,
  };
}

export async function processNotification(job: Job<NotificationEvent>) {
  const event = job.data;
  const { recipientId, kind, title, body } = event;

  // Skip push only when the app has explicitly reported foreground-active state.
  // Socket presence can outlive a physical device background transition.
  const suppressPush = await shouldSuppressPushForUser(recipientId);
  console.log(`[NotificationWorker] job ${job.id} | type=${kind} | recipient=${recipientId} | suppressPush=${suppressPush}`);

  if (suppressPush) {
    console.log('[NotificationWorker] skipping push - app is foreground-active');
    return { skipped: true, reason: 'user_online' };
  }

  // Get user's FCM tokens
  const userDevices = await db.select()
    .from(devices)
    .where(eq(devices.userId, recipientId));

  console.log(`[NotificationWorker] devices found: ${userDevices.length}`);

  if (userDevices.length === 0) {
    console.log(`[NotificationWorker] skipping push — no devices registered`);
    return { skipped: true, reason: 'no_devices' };
  }

  const tokens = userDevices.map((d) => d.fcmToken);
  const expoTokens = tokens.filter(isExpoPushToken);
  const fcmTokens = tokens.filter((token) => !isExpoPushToken(token));
  console.log(`[NotificationWorker] sending to ${expoTokens.length} Expo and ${fcmTokens.length} FCM token(s)`);

  const expoResult = await sendExpoPushNotifications(expoTokens, event);
  console.log(`[NotificationWorker] Expo result: success=${expoResult.sent} failed=${expoResult.failed}`);

  // Send multicast notification
  const response = fcmTokens.length > 0
    ? await firebaseMessaging.sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data: notificationData(event),
        android: {
          priority: 'high',
          notification: { channelId: kind === 'message.new' ? 'messages' : 'gasps' },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              'mutable-content': 1,
            },
          },
        },
      })
    : { successCount: 0, failureCount: 0, responses: [] };

  console.log(`[NotificationWorker] FCM result: success=${response.successCount} failed=${response.failureCount}`);
  response.responses.forEach((resp, i) => {
    if (!resp.success) {
      console.log(`[NotificationWorker] token ${i} failed: ${resp.error?.code} — ${resp.error?.message}`);
    }
  });

  // Remove invalid tokens
  const invalidTokens: string[] = [];
  response.responses.forEach((resp, i) => {
    if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
      invalidTokens.push(fcmTokens[i]!);
    }
  });

  if (invalidTokens.length > 0) {
    for (const token of invalidTokens) {
      await db.delete(devices).where(eq(devices.fcmToken, token));
    }
  }

  return {
    sent: response.successCount + expoResult.sent,
    failed: response.failureCount + expoResult.failed,
    invalidTokensRemoved: invalidTokens.length,
  };
}

export function startNotificationWorker() {
  const worker = new Worker('notifications', processNotification, {
    connection: { url: env.REDIS_URL },
    concurrency: 10,
  });

  worker.on('failed', (job, err) => {
    console.error(`Notification job ${job?.id} failed:`, err.message);
  });

  return worker;
}
