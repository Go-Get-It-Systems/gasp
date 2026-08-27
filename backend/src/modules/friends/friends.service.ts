import { eq, or, and, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { friendships } from '../../db/schema/friendships.js';
import { users } from '../../db/schema/users.js';
import { redis } from '../../config/redis.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors.js';
import { toFriendResponse } from './friends.transformers.js';
import { assertUsersCanInteract, getBlockedUserIds } from '../safety/safety.service.js';

export async function listFriends(userId: string) {
  const blockedUserIds = await getBlockedUserIds(userId);
  // Get accepted friendships where user is either requester or addressee
  const result = await db.select({
    friendshipId: friendships.id,
    friendId: sql<string>`
      CASE
        WHEN ${friendships.requesterId} = ${userId} THEN ${friendships.addresseeId}
        ELSE ${friendships.requesterId}
      END
    `,
    since: friendships.createdAt,
  })
    .from(friendships)
    .where(
      and(
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId),
        ),
        eq(friendships.status, 'accepted'),
      ),
    );

  // Enrich with user data and online status
  const friendIds = result
    .map((r) => r.friendId)
    .filter((friendId) => !blockedUserIds.includes(friendId));
  if (friendIds.length === 0) return [];

  const friendUsers = await db.select()
    .from(users)
    .where(sql`${users.id} IN ${friendIds}`);

  // Build Maps for O(1) lookups instead of O(n) .find() inside .map()
  const friendshipMap = new Map(result.map((r) => [r.friendId, r]));

  // Check online status from Redis
  const pipeline = redis.pipeline();
  for (const fId of friendIds) {
    pipeline.zscore('presence:online', fId);
  }
  const onlineScores = await pipeline.exec();

  const onlineMap = new Map<string, boolean>();
  friendIds.forEach((fId, i) => {
    const score = onlineScores?.[i]?.[1];
    onlineMap.set(fId, score !== null && score !== undefined);
  });

  return friendUsers.map((friend) => {
    const friendship = friendshipMap.get(friend.id);
    if (!friendship) {
      throw new Error(`Inconsistent state: friendship missing for friend ${friend.id}`);
    }
    return toFriendResponse(friend, { friendshipId: friendship.friendshipId }, onlineMap.get(friend.id) ?? false);
  });
}

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) {
    throw new BadRequestError('Cannot send friend request to yourself');
  }

  await assertUsersCanInteract(requesterId, addresseeId);

  // Check if addressee exists
  const addressee = await db.query.users.findFirst({
    where: eq(users.id, addresseeId),
  });

  if (!addressee) throw new NotFoundError('User');

  // Check for existing friendship in either direction
  const existing = await db.query.friendships.findFirst({
    where: or(
      and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
      and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId)),
    ),
  });

  if (existing) {
    if (existing.status === 'accepted') {
      throw new ConflictError('Already friends');
    }
    if (existing.status === 'pending') {
      throw new ConflictError('Friend request already pending');
    }
    if (existing.status === 'blocked') {
      throw new ForbiddenError('Cannot send friend request');
    }
  }

  const [friendship] = await db.insert(friendships).values({
    requesterId,
    addresseeId,
  }).returning();

  return friendship!;
}

export async function acceptFriendRequest(userId: string, friendshipId: string) {
  const friendship = await db.query.friendships.findFirst({
    where: eq(friendships.id, friendshipId),
  });

  if (!friendship) throw new NotFoundError('Friend request');
  if (friendship.addresseeId !== userId) throw new ForbiddenError('Cannot accept this request');
  if (friendship.status !== 'pending') throw new BadRequestError('Request is not pending');
  await assertUsersCanInteract(userId, friendship.requesterId);

  const [updated] = await db.update(friendships)
    .set({ status: 'accepted', updatedAt: new Date() })
    .where(eq(friendships.id, friendshipId))
    .returning();

  return updated!;
}

export async function rejectFriendRequest(userId: string, friendshipId: string) {
  const friendship = await db.query.friendships.findFirst({
    where: eq(friendships.id, friendshipId),
  });

  if (!friendship) throw new NotFoundError('Friend request');
  if (friendship.addresseeId !== userId) throw new ForbiddenError('Cannot reject this request');
  if (friendship.status !== 'pending') throw new BadRequestError('Request is not pending');

  await db.delete(friendships).where(eq(friendships.id, friendshipId));
}

export async function removeFriend(userId: string, friendshipId: string) {
  const friendship = await db.query.friendships.findFirst({
    where: eq(friendships.id, friendshipId),
  });

  if (!friendship) throw new NotFoundError('Friendship');
  if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
    throw new ForbiddenError('Not your friendship');
  }

  await db.delete(friendships).where(eq(friendships.id, friendshipId));
}

export async function getPendingRequests(userId: string) {
  const blockedUserIds = await getBlockedUserIds(userId);
  const pending = await db.select()
    .from(friendships)
    .innerJoin(users, eq(friendships.requesterId, users.id))
    .where(
      and(
        eq(friendships.addresseeId, userId),
        eq(friendships.status, 'pending'),
      ),
    );

  return pending.filter(({ users: u }) => !blockedUserIds.includes(u.id)).map(({ friendships: f, users: u }) => ({
    friendshipId: f.id,
    requester: {
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
    },
    createdAt: f.createdAt,
  }));
}
