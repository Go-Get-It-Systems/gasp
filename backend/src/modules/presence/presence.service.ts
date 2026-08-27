import { redis } from '../../config/redis.js';

const PRESENCE_KEY = 'presence:online';
const OFFLINE_THRESHOLD = 60; // seconds

export async function setUserOnline(userId: string) {
  await redis.zadd(PRESENCE_KEY, Date.now(), userId);
}

export async function setUserOffline(userId: string) {
  await redis.zrem(PRESENCE_KEY, userId);
}

export async function isOnline(userId: string): Promise<boolean> {
  const score = await redis.zscore(PRESENCE_KEY, userId);
  if (score === null) return false;
  return Date.now() - Number(score) < OFFLINE_THRESHOLD * 1000;
}

export async function getOnlineUserIds(): Promise<string[]> {
  return redis.zrangebyscore(
    PRESENCE_KEY,
    Date.now() - OFFLINE_THRESHOLD * 1000,
    '+inf',
  );
}

export async function getOnlineCount(): Promise<number> {
  return redis.zcount(
    PRESENCE_KEY,
    Date.now() - OFFLINE_THRESHOLD * 1000,
    '+inf',
  );
}

export async function getBulkOnlineStatus(userIds: string[]): Promise<Map<string, boolean>> {
  const pipeline = redis.pipeline();
  for (const id of userIds) {
    pipeline.zscore(PRESENCE_KEY, id);
  }
  const results = await pipeline.exec();

  const statusMap = new Map<string, boolean>();
  userIds.forEach((id, i) => {
    const score = results?.[i]?.[1] as string | null;
    const online = score !== null && Date.now() - Number(score) < OFFLINE_THRESHOLD * 1000;
    statusMap.set(id, online);
  });

  return statusMap;
}
