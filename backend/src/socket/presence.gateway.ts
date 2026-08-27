import type { Server as SocketIOServer, Socket } from 'socket.io';
import { redis } from '../config/redis.js';
import type { NotificationAppState, NotificationAppVisibility } from '../shared/types.js';

const PRESENCE_KEY = 'presence:online';
const NOTIFICATION_APP_STATE_PREFIX = 'notification:app_state';
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const OFFLINE_THRESHOLD = 60; // seconds
const APP_STATE_TTL_SECONDS = 120;

interface NotificationAppStatePayload {
  state?: NotificationAppVisibility;
  activeConversationId?: string | null;
}

function notificationAppStateKey(userId: string) {
  return `${NOTIFICATION_APP_STATE_PREFIX}:${userId}`;
}

function normalizeAppStatePayload(payload: NotificationAppStatePayload): NotificationAppState | null {
  if (!payload || !['active', 'inactive', 'background'].includes(String(payload.state))) {
    return null;
  }

  return {
    state: payload.state as NotificationAppVisibility,
    ...(payload.activeConversationId ? { activeConversationId: payload.activeConversationId } : {}),
    updatedAt: new Date().toISOString(),
  };
}

export async function setNotificationAppState(userId: string, state: NotificationAppState) {
  await redis.set(notificationAppStateKey(userId), JSON.stringify(state), 'EX', APP_STATE_TTL_SECONDS);
}

export async function getNotificationAppState(userId: string): Promise<NotificationAppState | null> {
  const raw = await redis.get(notificationAppStateKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as NotificationAppState;
    if (!['active', 'inactive', 'background'].includes(parsed.state)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function shouldSuppressPushForUser(userId: string): Promise<boolean> {
  const state = await getNotificationAppState(userId);
  if (state?.state !== 'active') return false;
  return isUserOnline(userId);
}

export function registerPresenceGateway(io: SocketIOServer) {
  io.on('connection', async (socket: Socket) => {
    const userId = socket.user.userId;

    // Mark user as online
    await redis.zadd(PRESENCE_KEY, Date.now(), userId);

    // Track socket-to-user mapping
    await redis.sadd(`socket:user:${userId}`, socket.id);

    // Notify friends that user is online
    socket.broadcast.emit('presence:user_online', {
      userId,
      lastSeenAt: new Date().toISOString(),
    });

    // Send current online users to the connecting client
    const onlineUsers = await redis.zrangebyscore(
      PRESENCE_KEY,
      Date.now() - OFFLINE_THRESHOLD * 1000,
      '+inf',
    );

    socket.emit('presence:bulk_status', {
      statuses: onlineUsers.map((uid) => ({
        userId: uid,
        status: 'online' as const,
      })),
    });

    // Heartbeat to keep presence alive
    const heartbeatTimer = setInterval(async () => {
      await redis.zadd(PRESENCE_KEY, Date.now(), userId);
    }, HEARTBEAT_INTERVAL);

    socket.on('notification:app_state', async (payload: NotificationAppStatePayload) => {
      const state = normalizeAppStatePayload(payload);
      if (!state) return;
      await setNotificationAppState(userId, state);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      clearInterval(heartbeatTimer);
      await setNotificationAppState(userId, {
        state: 'background',
        updatedAt: new Date().toISOString(),
      });

      // Remove this socket from user's socket set
      await redis.srem(`socket:user:${userId}`, socket.id);

      // Check if user has any other active sockets
      const remainingSockets = await redis.scard(`socket:user:${userId}`);

      if (remainingSockets === 0) {
        // User is fully offline
        await redis.zrem(PRESENCE_KEY, userId);
        await redis.del(`socket:user:${userId}`);

        socket.broadcast.emit('presence:user_offline', {
          userId,
          lastSeenAt: new Date().toISOString(),
        });
      }
    });
  });
}

// Helper: check if a user is online
export async function isUserOnline(userId: string): Promise<boolean> {
  const score = await redis.zscore(PRESENCE_KEY, userId);
  if (score === null) return false;
  return Date.now() - Number(score) < OFFLINE_THRESHOLD * 1000;
}

// Helper: get all online user IDs
export async function getOnlineUsers(): Promise<string[]> {
  return redis.zrangebyscore(
    PRESENCE_KEY,
    Date.now() - OFFLINE_THRESHOLD * 1000,
    '+inf',
  );
}
