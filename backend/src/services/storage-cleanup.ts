import { getStorage } from 'firebase-admin/storage';
import { eq, and, lt, or, isNotNull, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { gasps } from '../db/schema/gasps.js';
import { reactions } from '../db/schema/reactions.js';

/**
 * Extract the Firebase Storage file path from a Firebase download URL.
 *
 * URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?...
 */
export function extractStoragePath(downloadUrl: string): string | null {
  try {
    const url = new URL(downloadUrl);
    const match = url.pathname.match(/\/o\/(.+)/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Delete a single file from Firebase Storage by its download URL.
 * Silently ignores 404 errors (file already deleted).
 */
async function deleteStorageFile(downloadUrl: string): Promise<boolean> {
  const path = extractStoragePath(downloadUrl);
  if (!path) return false;

  const bucket = getStorage().bucket();
  const file = bucket.file(path);

  try {
    await file.delete();
    return true;
  } catch (error: unknown) {
    const code = (error as { code?: number }).code;
    if (code === 404) {
      // File already deleted — that's fine
      return true;
    }
    console.error(`[storage-cleanup] Failed to delete ${path}:`, (error as Error).message);
    return false;
  }
}

interface StorageCleanupResult {
  gaspsProcessed: number;
  gaspsFilesDeleted: number;
  gaspsFilesFailed: number;
  reactionsProcessed: number;
  reactionsFilesDeleted: number;
  reactionsFilesFailed: number;
}

/**
 * Clean up Firebase Storage files for expired gasps.
 *
 * 1. Finds gasps where status = 'expired' AND imageUrl is not null
 * 2. Deletes each file from Firebase Storage
 * 3. Nullifies imageUrl in the DB so we don't retry
 *
 * Also cleans up reaction videos for those expired gasps (cascade relationship).
 */
export async function cleanupExpiredGaspStorage(): Promise<StorageCleanupResult> {
  const result: StorageCleanupResult = {
    gaspsProcessed: 0,
    gaspsFilesDeleted: 0,
    gaspsFilesFailed: 0,
    reactionsProcessed: 0,
    reactionsFilesDeleted: 0,
    reactionsFilesFailed: 0,
  };

  // --- Gasp image cleanup ---
  // Find expired gasps that still have an imageUrl (haven't been cleaned up yet)
  const expiredGasps = await db.select({
    id: gasps.id,
    imageUrl: gasps.imageUrl,
  })
    .from(gasps)
    .where(
      and(
        or(
          eq(gasps.status, 'expired'),
          lt(gasps.expiresAt, new Date()),
        ),
        isNotNull(gasps.imageUrl),
        sql`${gasps.imageUrl} != ''`,
      ),
    )
    .limit(200); // Process in batches to avoid overwhelming the worker

  result.gaspsProcessed = expiredGasps.length;

  for (const gasp of expiredGasps) {
    const deleted = await deleteStorageFile(gasp.imageUrl);
    if (deleted) {
      result.gaspsFilesDeleted++;
      // Nullify imageUrl so we don't try to delete again
      await db.update(gasps)
        .set({ imageUrl: '' })
        .where(eq(gasps.id, gasp.id));
    } else {
      result.gaspsFilesFailed++;
    }
  }

  // --- Reaction video cleanup ---
  // Reactions reference a gasp via gaspId. When the gasp is expired, its reactions
  // should also have their storage files cleaned up.
  const expiredReactions = await db.select({
    id: reactions.id,
    videoUrl: reactions.videoUrl,
  })
    .from(reactions)
    .innerJoin(gasps, eq(reactions.gaspId, gasps.id))
    .where(
      and(
        or(
          eq(gasps.status, 'expired'),
          lt(gasps.expiresAt, new Date()),
        ),
        isNotNull(reactions.videoUrl),
        sql`${reactions.videoUrl} != ''`,
      ),
    )
    .limit(200);

  result.reactionsProcessed = expiredReactions.length;

  for (const reaction of expiredReactions) {
    const deleted = await deleteStorageFile(reaction.videoUrl);
    if (deleted) {
      result.reactionsFilesDeleted++;
      // Nullify videoUrl so we don't try to delete again
      await db.update(reactions)
        .set({ videoUrl: '' })
        .where(eq(reactions.id, reaction.id));
    } else {
      result.reactionsFilesFailed++;
    }
  }

  return result;
}
