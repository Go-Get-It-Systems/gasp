import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import type { users } from '../../db/schema/users.js';
import { toFriendResponse } from './friends.transformers.js';

type UserRow = typeof users.$inferSelect;

const baseUser: UserRow = {
  id: 'u_friend_1',
  firebaseUid: 'fb_uid_secret',
  phoneNumber: '+5511999990001',
  displayName: 'Alice',
  username: 'alice',
  avatarUrl: 'https://cdn.example.com/alice.png',
  bio: 'hello world',
  accountType: 'personal',
  isActive: true,
  lastSeenAt: new Date('2026-05-10T12:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-05-10T12:00:00.000Z'),
};

const FrontendFriendSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  phoneNumber: z.string().optional(),
  createdAt: z.string(),
  friendshipStatus: z
    .enum(['none', 'pending_outgoing', 'pending_incoming', 'friends', 'blocked'])
    .optional(),
  friendshipId: z.string(),
  onlineStatus: z.enum(['online', 'offline', 'away']),
  lastSeenAt: z.string(),
});

describe('toFriendResponse', () => {
  test('maps user + friendship + online=true to expected FriendResponse', () => {
    const out = toFriendResponse(baseUser, { friendshipId: 'fr_123' }, true);

    expect(out).toEqual({
      id: 'u_friend_1',
      displayName: 'Alice',
      username: 'alice',
      avatarUrl: 'https://cdn.example.com/alice.png',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      friendshipId: 'fr_123',
      onlineStatus: 'online',
      lastSeenAt: new Date('2026-05-10T12:00:00.000Z'),
    });
  });

  test('onlineStatus is "offline" when isOnline=false', () => {
    const out = toFriendResponse(baseUser, { friendshipId: 'fr_123' }, false);
    expect(out.onlineStatus).toBe('offline');
  });

  test('lastSeenAt falls back to createdAt when DB value is null', () => {
    const out = toFriendResponse(
      { ...baseUser, lastSeenAt: null },
      { friendshipId: 'fr_123' },
      false,
    );
    expect(out.lastSeenAt).toEqual(baseUser.createdAt);
  });

  test('avatarUrl preserves null (user without avatar)', () => {
    const out = toFriendResponse(
      { ...baseUser, avatarUrl: null },
      { friendshipId: 'fr_123' },
      false,
    );
    expect(out.avatarUrl).toBeNull();
  });

  test('does not leak firebaseUid, phoneNumber, bio, isActive, updatedAt', () => {
    const out = toFriendResponse(baseUser, { friendshipId: 'fr_123' }, true) as Record<string, unknown>;

    expect(out).not.toHaveProperty('firebaseUid');
    expect(out).not.toHaveProperty('phoneNumber');
    expect(out).not.toHaveProperty('bio');
    expect(out).not.toHaveProperty('isActive');
    expect(out).not.toHaveProperty('updatedAt');
  });

  test('payload contains exactly the 8 contracted keys (no extras, no misses)', () => {
    const out = toFriendResponse(baseUser, { friendshipId: 'fr_123' }, true);
    expect(Object.keys(out).sort()).toEqual([
      'avatarUrl',
      'createdAt',
      'displayName',
      'friendshipId',
      'id',
      'lastSeenAt',
      'onlineStatus',
      'username',
    ]);
  });

  test('after JSON round-trip, payload passes frontend FriendSchema (anti-regression)', () => {
    const out = toFriendResponse(baseUser, { friendshipId: 'fr_123' }, true);
    const wireFormat = JSON.parse(JSON.stringify(out));

    const result = FrontendFriendSchema.safeParse(wireFormat);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.onlineStatus).toBe('online');
      expect(result.data.lastSeenAt).toBe('2026-05-10T12:00:00.000Z');
      expect(result.data.createdAt).toBe('2026-01-01T00:00:00.000Z');
    }
  });

  test('JSON round-trip with null lastSeenAt still passes frontend schema (uses createdAt)', () => {
    const out = toFriendResponse(
      { ...baseUser, lastSeenAt: null },
      { friendshipId: 'fr_123' },
      false,
    );
    const wireFormat = JSON.parse(JSON.stringify(out));

    const result = FrontendFriendSchema.safeParse(wireFormat);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lastSeenAt).toBe('2026-01-01T00:00:00.000Z');
    }
  });
});
