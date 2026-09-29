import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ──────────────────────────────────────────────────────────────

interface CacheEntry {
  localPath: string;
  expiresAt: string; // ISO date
  sizeBytes: number;
}

/** key = hashed URL */
type CacheIndex = Record<string, CacheEntry>;

// ── Constants ──────────────────────────────────────────────────────────

const CACHE_DIR_NAME = 'gasp-media';
const STORAGE_KEY = 'gasp_media_cache_index';

// ── In-memory index (loaded once via initCache) ────────────────────────

let index: CacheIndex = {};
let cacheDir: Directory | null = null;
let initialized = false;

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Simple string hash — converts a URL to a base-36 string.
 * Not cryptographic, just needs to be fast and deterministic.
 */
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract file extension from a URL (before query params).
 * Defaults to `.jpg` when none is found.
 */
function getExtension(url: string): string {
  try {
    const pathname = url.split('?')[0] ?? url;
    const match = pathname.match(/\.(\w+)$/);
    if (match) return `.${match[1]!.toLowerCase()}`;
  } catch {
    // ignore parse errors
  }
  return '.jpg';
}

/** Persist the in-memory index to AsyncStorage. */
async function persistIndex(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  } catch (err) {
    console.warn('[mediaCache] Failed to persist index:', err);
  }
}

/** Ensure the cache directory exists and return it. */
function ensureDirectory(): Directory {
  if (!cacheDir) {
    cacheDir = new Directory(Paths.cache, CACHE_DIR_NAME);
  }
  if (!cacheDir.exists) {
    cacheDir.create();
  }
  return cacheDir;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Initialize the media cache:
 * 1. Load the index from AsyncStorage into memory.
 * 2. Ensure the cache directory exists on disk.
 * 3. Run a cleanup pass for expired entries.
 */
export async function initCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    index = raw ? (JSON.parse(raw) as CacheIndex) : {};
    ensureDirectory();
    await cleanupExpired();
    initialized = true;
  } catch (err) {
    console.warn('[mediaCache] initCache failed:', err);
    index = {};
  }
}

/**
 * Download and cache a remote media file.
 * If the file is already cached (and still on disk), returns the existing local URI.
 *
 * @param url       Remote URL to download.
 * @param expiresAt ISO date string — when the cached file should be considered expired.
 * @returns         Local `file://` URI pointing to the cached file.
 */
export async function cacheMedia(url: string, expiresAt: string): Promise<string> {
  if (!url) return url;
  try {
    const key = hashUrl(url);
    const existing = index[key];

    // Already cached — verify the file still exists on disk
    if (existing) {
      const file = new File(existing.localPath);
      if (file.exists) {
        return existing.localPath;
      }
      // File was evicted by the OS; fall through to re-download
    }

    const dir = ensureDirectory();
    const ext = getExtension(url);
    const fileName = `${key}${ext}`;

    // Download to cache directory
    const downloaded = await File.downloadFileAsync(url, dir);

    // Rename to our hashed filename
    const targetPath = `${dir.uri}${fileName}`;
    const targetFile = new File(targetPath);
    if (targetFile.exists) {
      targetFile.delete();
    }
    downloaded.move(targetFile);

    const sizeBytes = targetFile.size ?? 0;
    const localPath = targetFile.uri;

    index[key] = { localPath, expiresAt, sizeBytes };
    await persistIndex();

    return localPath;
  } catch (err) {
    console.warn('[mediaCache] cacheMedia failed for URL:', url, err);
    // Caller can fall back to the remote URL
    return url;
  }
}

/**
 * Synchronous lookup — returns the local URI if the file is cached and not expired.
 * Returns `null` otherwise.
 */
export function getCachedUri(url: string): string | null {
  try {
    const key = hashUrl(url);
    const entry = index[key];
    if (!entry) return null;

    const now = new Date();
    const expires = new Date(entry.expiresAt);
    if (expires <= now) return null;

    return entry.localPath;
  } catch {
    return null;
  }
}

/**
 * Delete all cached files and clear the index (both in-memory and AsyncStorage).
 */
export async function clearAllCache(): Promise<void> {
  try {
    const dir = new Directory(Paths.cache, CACHE_DIR_NAME);
    if (dir.exists) {
      dir.delete();
    }
    dir.create();
    cacheDir = dir;

    index = {};
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[mediaCache] clearAllCache failed:', err);
  }
}

/**
 * Returns the total size (in bytes) of all currently cached files.
 */
export async function getCacheSize(): Promise<number> {
  let total = 0;
  for (const entry of Object.values(index)) {
    total += entry.sizeBytes;
  }
  return total;
}

/**
 * Delete files whose `expiresAt` is in the past.
 * Updates the in-memory index and persists it.
 *
 * @returns Number of expired entries that were removed.
 */
export async function cleanupExpired(): Promise<number> {
  try {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, entry] of Object.entries(index)) {
      if (new Date(entry.expiresAt) <= now) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length === 0) return 0;

    // Delete files
    for (const key of expiredKeys) {
      const entry = index[key];
      if (!entry) continue;
      try {
        const file = new File(entry.localPath);
        if (file.exists) {
          file.delete();
        }
      } catch {
        // File may already be gone — that's fine
      }
      delete index[key];
    }

    await persistIndex();
    return expiredKeys.length;
  } catch (err) {
    console.warn('[mediaCache] cleanupExpired failed:', err);
    return 0;
  }
}
