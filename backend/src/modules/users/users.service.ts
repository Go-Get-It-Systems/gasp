import { and, count, eq, ilike, inArray, notInArray, or, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { friendships } from '../../db/schema/friendships.js';
import { gasps } from '../../db/schema/gasps.js';
import { reactions } from '../../db/schema/reactions.js';
import { users } from '../../db/schema/users.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import { assertUsersCanView, getBlockedUserIds } from '../safety/safety.service.js';
import type { UpdateProfileInput } from './users.schemas.js';

export async function getProfile(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new NotFoundError('User');
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.username) {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, input.username.toLowerCase()),
    });

    if (existing && existing.id !== userId) {
      throw new ConflictError('Username already taken');
    }

    input.username = input.username.toLowerCase();
  }

  const [updated] = await db.update(users)
    .set({
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.username !== undefined && { username: input.username }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      ...(input.bio !== undefined && { bio: input.bio }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) throw new NotFoundError('User');
  return updated;
}

export type FriendshipStatusForUser =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'friends'
  | 'blocked';

export async function getUserById(userId: string, currentUserId?: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new NotFoundError('User');

  if (currentUserId) await assertUsersCanView(currentUserId, userId);

  const { phoneNumber, ...publicProfile } = user;

  let friendshipStatus: FriendshipStatusForUser = 'none';
  let friendshipId: string | undefined;

  if (currentUserId && currentUserId !== userId) {
    const friendship = await db.query.friendships.findFirst({
      where: or(
        and(eq(friendships.requesterId, currentUserId), eq(friendships.addresseeId, userId)),
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, currentUserId)),
      ),
    });

    if (friendship) {
      friendshipId = friendship.id;
      if (friendship.status === 'accepted') {
        friendshipStatus = 'friends';
      } else if (friendship.status === 'pending') {
        friendshipStatus = friendship.requesterId === currentUserId
          ? 'pending_outgoing'
          : 'pending_incoming';
      } else if (friendship.status === 'blocked') {
        friendshipStatus = 'blocked';
      }
    }
  }

  return {
    ...publicProfile,
    friendshipStatus,
    friendshipId,
  };
}

export async function getUserStats(userId: string, currentUserId?: string) {
  if (currentUserId) await assertUsersCanView(currentUserId, userId);
  const [[sentResult], [receivedResult], [friendsResult]] = await Promise.all([
    db.select({ value: count() })
      .from(gasps)
      .where(eq(gasps.senderId, userId)),
    db.select({ value: count() })
      .from(gasps)
      .where(eq(gasps.recipientId, userId)),
    db.select({ value: count() })
      .from(friendships)
      .where(
        and(
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId),
          ),
          eq(friendships.status, 'accepted'),
        ),
      ),
  ]);

  return {
    gaspsSent: sentResult!.value,
    gaspsReceived: receivedResult!.value,
    friendsCount: friendsResult!.value,
  };
}

function escapeLikePattern(pattern: string): string {
  return pattern.replace(/[%_\\]/g, '\\$&');
}

export async function searchUsers(query: string, currentUserId: string) {
  const blockedUserIds = await getBlockedUserIds(currentUserId);
  const escaped = escapeLikePattern(query);
  const results = await db.select()
    .from(users)
    .where(
      or(
        ilike(users.username, `%${escaped}%`),
        ilike(users.displayName, `%${escaped}%`),
      ),
    )
    .limit(20);

  return results
    .filter((u) => u.id !== currentUserId && !blockedUserIds.includes(u.id))
    .map(({ phoneNumber, ...rest }) => rest);
}

// ---------------------------------------------------------------------------
// Helper functions for recommended users / top gaspers
// ---------------------------------------------------------------------------

// Quick stats for a single user (gasp score components)
async function getQuickStats(userId: string) {
  const [[sent], [received], [reactionsCount]] = await Promise.all([
    db.select({ value: count() }).from(gasps).where(eq(gasps.senderId, userId)),
    db.select({ value: count() }).from(gasps).where(eq(gasps.recipientId, userId)),
    db.select({ value: count() })
      .from(reactions)
      .innerJoin(gasps, eq(reactions.gaspId, gasps.id))
      .where(eq(gasps.senderId, userId)),
  ]);
  return { sent: sent!.value, received: received!.value, reactions: reactionsCount!.value };
}

async function getMutualFriendsCount(userId: string, currentUserId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(DISTINCT common_friend)::int as count FROM (
      SELECT CASE WHEN requester_id = ${userId} THEN addressee_id ELSE requester_id END as common_friend
      FROM friendships WHERE (requester_id = ${userId} OR addressee_id = ${userId}) AND status = 'accepted'
      INTERSECT
      SELECT CASE WHEN requester_id = ${currentUserId} THEN addressee_id ELSE requester_id END as common_friend
      FROM friendships WHERE (requester_id = ${currentUserId} OR addressee_id = ${currentUserId}) AND status = 'accepted'
    ) mutual
  `);
  return (result[0] as { count: number } | undefined)?.count ?? 0;
}

async function getMutualFriendAvatars(userId: string, myFriendIds: string[], limit: number): Promise<string[]> {
  if (myFriendIds.length === 0) return [];
  // Find friends of userId that are also in myFriendIds
  const mutualFriends = await db.select({ avatarUrl: users.avatarUrl })
    .from(friendships)
    .innerJoin(users, or(
      and(eq(friendships.requesterId, users.id), eq(friendships.addresseeId, userId)),
      and(eq(friendships.addresseeId, users.id), eq(friendships.requesterId, userId)),
    ))
    .where(
      and(
        eq(friendships.status, 'accepted'),
        inArray(users.id, myFriendIds),
      ),
    )
    .limit(limit);

  return mutualFriends.map((f) => f.avatarUrl).filter((url): url is string => url !== null);
}

type UserLike = { id: string; displayName: string; username: string; avatarUrl: string | null; createdAt: Date; accountType?: string };

const BADGE_THRESHOLDS = {
  TOP10_SCORE: 500,
  RISING_SCORE: 200,
  ACTIVE_SCORE: 50,
  NEW_USER_DAYS: 7,
} as const;

function determineBadge(gaspScore: number, createdAt: Date): string | null {
  const daysSinceJoin = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));

  if (gaspScore >= BADGE_THRESHOLDS.TOP10_SCORE) return 'top10';
  if (gaspScore >= BADGE_THRESHOLDS.RISING_SCORE) return 'rising';
  if (daysSinceJoin <= BADGE_THRESHOLDS.NEW_USER_DAYS) return 'new';
  if (gaspScore >= BADGE_THRESHOLDS.ACTIVE_SCORE) return 'active';
  return null;
}

function formatRecommendedUser(
  user: UserLike,
  stats: { sent: number; received: number; reactions: number },
  mutualCount: number,
  mutualAvatars: string[],
) {
  const gaspScore = stats.sent + stats.received + stats.reactions;
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    accountType: user.accountType ?? 'personal',
    gaspScore,
    streak: 0,
    mutualFriendsCount: mutualCount,
    mutualFriendAvatars: mutualAvatars,
    badge: determineBadge(gaspScore, user.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Extended stats, recommended users, top gaspers
// ---------------------------------------------------------------------------

export async function getExtendedStats(userId: string, currentUserId?: string) {
  if (currentUserId) await assertUsersCanView(currentUserId, userId);
  const [[sentResult], [receivedResult], [friendsResult], [reactionsResult]] = await Promise.all([
    db.select({ value: count() })
      .from(gasps)
      .where(eq(gasps.senderId, userId)),
    db.select({ value: count() })
      .from(gasps)
      .where(eq(gasps.recipientId, userId)),
    db.select({ value: count() })
      .from(friendships)
      .where(
        and(
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId),
          ),
          eq(friendships.status, 'accepted'),
        ),
      ),
    // Count reactions on gasps sent by this user
    db.select({ value: count() })
      .from(reactions)
      .innerJoin(gasps, eq(reactions.gaspId, gasps.id))
      .where(eq(gasps.senderId, userId)),
  ]);

  // Calculate streak: count consecutive days with sent gasps going backwards from today
  const streakResult = await db.execute(sql`
    WITH daily_gasps AS (
      SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') as gasp_date
      FROM gasps
      WHERE sender_id = ${userId}
      ORDER BY gasp_date DESC
    ),
    streak AS (
      SELECT gasp_date,
        gasp_date - (ROW_NUMBER() OVER (ORDER BY gasp_date DESC))::int AS grp
      FROM daily_gasps
    )
    SELECT COUNT(*)::int as streak_count
    FROM streak
    WHERE grp = (SELECT grp FROM streak ORDER BY gasp_date DESC LIMIT 1)
      AND (SELECT gasp_date FROM daily_gasps LIMIT 1) >= CURRENT_DATE - INTERVAL '1 day'
  `);

  const streakCount = (streakResult[0] as { streak_count: number } | undefined)?.streak_count ?? 0;

  return {
    gaspsSent: sentResult!.value,
    gaspsReceived: receivedResult!.value,
    friendsCount: friendsResult!.value,
    reactionsReceived: reactionsResult!.value,
    streak: streakCount,
  };
}

export async function getRecommendedUsers(currentUserId: string, additionalExcludeIds: string[] = []) {
  const blockedUserIds = await getBlockedUserIds(currentUserId);
  const excludeIds = [...new Set([...additionalExcludeIds, ...blockedUserIds])];
  // Get current user's friend IDs
  const myFriendships = await db.select()
    .from(friendships)
    .where(
      and(
        or(
          eq(friendships.requesterId, currentUserId),
          eq(friendships.addresseeId, currentUserId),
        ),
        eq(friendships.status, 'accepted'),
      ),
    );

  const myFriendIds = myFriendships.map((f) =>
    f.requesterId === currentUserId ? f.addresseeId : f.requesterId,
  );

  if (myFriendIds.length === 0) {
    // No friends yet — return random active users
    const randomUsers = await db.select()
      .from(users)
      .where(and(
        eq(users.isActive, true),
        sql`${users.id} != ${currentUserId}`,
        excludeIds.length > 0 ? notInArray(users.id, excludeIds) : undefined,
      ))
      .limit(10);

    // N+1: one getQuickStats query per user. Parallelised via Promise.all and
    // capped at 10 users, so acceptable for now. Batch into a single query if
    // performance becomes an issue.
    return Promise.all(randomUsers.map(async (u) => {
      const stats = await getQuickStats(u.id);
      return formatRecommendedUser(u, stats, 0, []);
    }));
  }

  // Find friends-of-friends (users who are friends with my friends but not with me)
  const fofQuery = await db.select({
    userId: users.id,
    displayName: users.displayName,
    username: users.username,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
    mutualCount: count().as('mutual_count'),
  })
    .from(friendships)
    .innerJoin(users, or(
      and(eq(friendships.requesterId, users.id), inArray(friendships.addresseeId, myFriendIds)),
      and(eq(friendships.addresseeId, users.id), inArray(friendships.requesterId, myFriendIds)),
    ))
    .where(
      and(
        eq(friendships.status, 'accepted'),
        sql`${users.id} != ${currentUserId}`,
        notInArray(users.id, myFriendIds),
        excludeIds.length > 0 ? notInArray(users.id, excludeIds) : undefined,
      ),
    )
    .groupBy(users.id, users.displayName, users.username, users.avatarUrl, users.createdAt)
    .orderBy(sql`mutual_count DESC`)
    .limit(10);

  // N+1: getQuickStats + getMutualFriendAvatars per user. Parallelised via
  // Promise.all and capped at 10 users, so acceptable for now. Batch into a
  // single query if performance becomes an issue.
  return Promise.all(fofQuery.map(async (row) => {
    const stats = await getQuickStats(row.userId);
    // Get mutual friend avatars (up to 3)
    const mutualAvatars = await getMutualFriendAvatars(row.userId, myFriendIds, 3);
    return formatRecommendedUser(
      { id: row.userId, displayName: row.displayName, username: row.username, avatarUrl: row.avatarUrl, createdAt: row.createdAt },
      stats,
      row.mutualCount,
      mutualAvatars,
    );
  }));
}

// Lightweight: only returns top gasper user IDs (no N+1 lookups)
async function getExcludeIdsForTopGaspers(currentUserId: string) {
  const blockedUserIds = await getBlockedUserIds(currentUserId);
  const myFriendships = await db.select()
    .from(friendships)
    .where(
      and(
        or(
          eq(friendships.requesterId, currentUserId),
          eq(friendships.addresseeId, currentUserId),
        ),
        eq(friendships.status, 'accepted'),
      ),
    );

  const excludeIds = [
    currentUserId,
    ...myFriendships.map((f) =>
      f.requesterId === currentUserId ? f.addresseeId : f.requesterId,
    ),
    ...blockedUserIds,
  ];

  return { myFriendships, excludeIds: [...new Set(excludeIds)] };
}

export async function getTopGasperIds(currentUserId: string): Promise<string[]> {
  const { excludeIds } = await getExcludeIdsForTopGaspers(currentUserId);
  const topUsers = await db.select({ userId: gasps.senderId })
    .from(gasps)
    .where(notInArray(gasps.senderId, excludeIds))
    .groupBy(gasps.senderId)
    .orderBy(sql`${count()} DESC`)
    .limit(10);
  return topUsers.map((r) => r.userId);
}

export async function getTopGaspers(currentUserId: string) {
  const { excludeIds } = await getExcludeIdsForTopGaspers(currentUserId);

  // Get users with most gasps sent (proxy for gasp score)
  const topUsers = await db.select({
    userId: gasps.senderId,
    gaspCount: count().as('gasp_count'),
  })
    .from(gasps)
    .where(notInArray(gasps.senderId, excludeIds))
    .groupBy(gasps.senderId)
    .orderBy(sql`gasp_count DESC`)
    .limit(10);

  // N+1: user lookup + getQuickStats + getMutualFriendsCount per user.
  // Parallelised via Promise.all and capped at 10 users, so acceptable for
  // now. Batch into a single query if performance becomes an issue.
  return Promise.all(topUsers.map(async (row) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) });
    if (!user) return null;
    const stats = await getQuickStats(user.id);
    const mutualCount = await getMutualFriendsCount(user.id, currentUserId);
    return formatRecommendedUser(user, stats, mutualCount, []);
  })).then((results) => results.filter((r): r is NonNullable<typeof r> => r !== null));
}
