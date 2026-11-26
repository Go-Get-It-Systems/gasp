/**
 * Web media stays at its original URL and uses the browser's HTTP cache.
 * The native offline file cache is unavailable here, so never report a local
 * copy or a size for browser-managed data that the app cannot enumerate.
 */
export async function initCache(): Promise<void> {}

export async function cacheMedia(url: string, _expiresAt: string): Promise<string> {
  return url;
}

export function getCachedUri(_url: string): string | null {
  return null;
}

// There are no app-managed web files to clear. Do not clear unrelated browser data.
export async function clearAllCache(): Promise<void> {}

export async function getCacheSize(): Promise<number> {
  return 0;
}

export async function cleanupExpired(): Promise<number> {
  return 0;
}
