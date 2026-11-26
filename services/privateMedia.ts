import { api } from './api';
import { assertCurrentSession, getSessionGeneration } from './session';

/** Stable storage references are never rendered directly for private media. */
export function isPrivateMediaUrl(uri?: string | null): boolean {
  if (!uri) return false;
  try {
    const url = new URL(uri);
    if (url.protocol !== 'https:') return false;
    if (url.hostname === 'storage.googleapis.com') {
      return /^\/[^/]+\/(gasps|reactions|composites|campaigns)\//.test(decodeURIComponent(url.pathname));
    }
    if (url.hostname === 'firebasestorage.googleapis.com') {
      return /^\/v0\/b\/[^/]+\/o\/(gasps|reactions|composites|campaigns)\//.test(decodeURIComponent(url.pathname));
    }
    return false;
  } catch { return false; }
}

const pending = new Map<string, Promise<string>>();
const grants = new Map<string, { uri: string; expiresAt: number }>();
export function clearMediaGrants(): void { pending.clear(); grants.clear(); }
export async function resolveMediaUri(uri: string): Promise<string> {
  if (!isPrivateMediaUrl(uri)) return uri;
  const generation = getSessionGeneration();
  const key = `${generation}:${uri}`;
  const cached = grants.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.uri;
  let request = pending.get(key);
  if (!request) {
    request = api.post<{ url: string; expiresAt: string }>('/uploads/access', { url: uri })
      .then(({ data }) => {
        assertCurrentSession(generation);
        const expiresAt = Math.min(Date.parse(data.expiresAt) - 10_000, Date.now() + 30_000);
        if (Number.isFinite(expiresAt) && expiresAt > Date.now()) grants.set(key, { uri: data.url, expiresAt });
        return data.url;
      });
    pending.set(key, request);
  }
  try { return await request; } finally { pending.delete(key); }
}
