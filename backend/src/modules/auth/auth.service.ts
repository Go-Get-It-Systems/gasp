import { and, eq } from 'drizzle-orm';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { db } from '../../config/database.js';
import { firebaseAuth } from '../../config/firebase.js';
import { redis } from '../../config/redis.js';
import { devices } from '../../db/schema/devices.js';
import { users } from '../../db/schema/users.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors.js';
import type { RegisterDeviceInput, RegisterInput } from './auth.schemas.js';

export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  try {
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid Firebase token');
  }
}

export async function registerUser(input: RegisterInput) {
  const decoded = await verifyFirebaseToken(input.firebaseToken);

  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.firebaseUid, decoded.uid),
  });

  if (existing) {
    return existing;
  }

  // Check username uniqueness
  const usernameExists = await db.query.users.findFirst({
    where: eq(users.username, input.username.toLowerCase()),
  });

  if (usernameExists) {
    throw new ConflictError('Username already taken');
  }

  const [user] = await db.insert(users).values({
    firebaseUid: decoded.uid,
    phoneNumber: decoded.phone_number ?? '',
    displayName: input.displayName,
    username: input.username.toLowerCase(),
    accountType: input.accountType ?? 'personal',
  }).returning();

  return user!;
}

export async function loginUser(firebaseToken: string) {
  const decoded = await verifyFirebaseToken(firebaseToken);

  const user = await db.query.users.findFirst({
    where: eq(users.firebaseUid, decoded.uid),
  });

  if (!user) {
    throw new UnauthorizedError('User not registered. Please sign up first.');
  }

  // Update last seen
  await db.update(users)
    .set({ lastSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return user;
}

export async function registerDevice(userId: string, input: RegisterDeviceInput) {
  // Upsert device token
  await db.insert(devices).values({
    userId,
    fcmToken: input.fcmToken,
    platform: input.platform,
    deviceId: input.deviceId,
  }).onConflictDoUpdate({
    target: devices.fcmToken,
    set: {
      userId,
      platform: input.platform,
      deviceId: input.deviceId,
      updatedAt: new Date(),
    },
  });
}

export async function removeDevice(userId: string, token: string) {
  const [deleted] = await db.delete(devices)
    .where(and(eq(devices.fcmToken, token), eq(devices.userId, userId)))
    .returning();
  if (!deleted) throw new NotFoundError('Device');
}

export async function getUserById(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function logoutUser(token: string) {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;
    await redis.setex(`blacklist:${token}`, ttl, '1');
  } catch {
    // If decode fails, token is already invalid
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await redis.exists(`blacklist:${token}`);
  return result === 1;
}
