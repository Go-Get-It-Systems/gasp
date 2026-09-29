import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadMedia, type UploadResult, type UploadProgress, type MediaType } from './storage';
import * as Sentry from '@sentry/react-native';

export type { MediaType };
export type { UploadProgress } from './storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadQueueItem {
  id: string;
  uri: string;
  type: MediaType;
  userId: string;
  status: 'pending' | 'uploading' | 'failed';
  attempts: number;
  createdAt: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUEUE_KEY = 'gasp_upload_queue';
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE = 1000; // 1s, 3s, 9s

// In-memory flag to prevent concurrent processQueue calls
let isProcessing = false;

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function readQueue(): Promise<UploadQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UploadQueueItem[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: UploadQueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    Sentry.captureException(error, { extra: { context: 'uploadQueue.writeQueue' } });
  }
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add an upload to the persistent queue and start processing.
 */
export async function enqueueUpload(
  uri: string,
  type: MediaType,
  userId: string,
): Promise<string> {
  const item: UploadQueueItem = {
    id: generateId(),
    uri,
    type,
    userId,
    status: 'pending',
    attempts: 0,
    createdAt: Date.now(),
  };

  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);

  if (__DEV__) {
    console.tronLog?.log('uploadQueue | enqueue', { id: item.id, type, uri: uri.slice(-50) });
  }

  // Fire-and-forget; callers don't await the result
  processQueue();

  return item.id;
}

/**
 * Process all pending items in the queue (one at a time, in order).
 * Safe to call multiple times — concurrent calls are no-ops.
 */
export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    let queue = await readQueue();

    for (const item of queue) {
      if (item.status !== 'pending') continue;

      // Mark as uploading
      queue = queue.map((q) => (q.id === item.id ? { ...q, status: 'uploading' as const } : q));
      await writeQueue(queue);

      let succeeded = false;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          await uploadMedia(item.uri, item.type, item.userId);
          succeeded = true;
          break;
        } catch (error) {
          const isLastAttempt = attempt === MAX_ATTEMPTS - 1;
          if (!isLastAttempt) {
            const delay = BACKOFF_BASE * Math.pow(3, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      if (succeeded) {
        if (__DEV__) {
          console.tronLog?.log('uploadQueue | success', { id: item.id, type: item.type });
        }
        // Remove completed item
        queue = queue.filter((q) => q.id !== item.id);
      } else {
        if (__DEV__) {
          console.tronLog?.error('uploadQueue | failed (max attempts)', { id: item.id, type: item.type, uri: item.uri.slice(-50) });
        }
        // Mark as failed
        queue = queue.map((q) =>
          q.id === item.id
            ? { ...q, status: 'failed' as const, attempts: MAX_ATTEMPTS }
            : q,
        );
        Sentry.captureMessage('Upload queue item failed after max attempts', {
          extra: { id: item.id, uri: item.uri.slice(-50), type: item.type },
        });
      }

      await writeQueue(queue);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Returns the current queue state (all items, any status).
 */
export async function getPendingUploads(): Promise<UploadQueueItem[]> {
  return readQueue();
}

/**
 * Reset a failed item back to pending and reprocess the queue.
 */
export async function retryFailed(id: string): Promise<void> {
  const queue = await readQueue();
  const updated = queue.map((q) =>
    q.id === id && q.status === 'failed'
      ? { ...q, status: 'pending' as const, attempts: 0 }
      : q,
  );
  await writeQueue(updated);
  processQueue();
}

/**
 * Remove an item from the queue (completed or cancelled).
 */
export async function removeFromQueue(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((q) => q.id !== id));
}

// ─── Inline use (send-gasp still uses this) ──────────────────────────────────

interface UploadTask {
  uri: string;
  type: MediaType;
  userId: string;
  attempt: number;
  maxAttempts: number;
}

/**
 * Upload with automatic retry and exponential backoff.
 * Retries up to maxAttempts times before throwing.
 * Use this for foreground uploads where you need the result immediately.
 */
export async function uploadWithRetry(
  uri: string,
  type: MediaType,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
  maxAttempts = 3,
): Promise<UploadResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await uploadMedia(uri, type, userId, onProgress);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts - 1) {
        const delay = BACKOFF_BASE * Math.pow(3, attempt); // 1s, 3s, 9s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  Sentry.captureException(lastError, {
    extra: { uri: uri.slice(-50), type, userId, maxAttempts },
  });

  throw lastError;
}
