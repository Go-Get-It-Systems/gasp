import type { users } from '../../db/schema/users.js';

type UserRow = typeof users.$inferSelect;

export type FriendResponse = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  createdAt: Date;
  friendshipId: string;
  onlineStatus: 'online' | 'offline' | 'away';
  lastSeenAt: Date;
};

export function toFriendResponse(
  friend: UserRow,
  friendship: { friendshipId: string },
  isOnline: boolean,
): FriendResponse {
  return {
    id: friend.id,
    displayName: friend.displayName,
    username: friend.username,
    avatarUrl: friend.avatarUrl,
    createdAt: friend.createdAt,
    friendshipId: friendship.friendshipId,
    onlineStatus: isOnline ? 'online' : 'offline',
    lastSeenAt: friend.lastSeenAt ?? friend.createdAt,
  };
}
