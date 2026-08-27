import { env } from '../config/env.js';

const ALLOWED_BUCKET =
  env.FIREBASE_STORAGE_BUCKET ?? `${env.FIREBASE_PROJECT_ID}.firebasestorage.app`;

const ALLOWED_HOSTS = [
  'firebasestorage.googleapis.com',
  `${env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
  `${env.FIREBASE_PROJECT_ID}.appspot.com`,
];

export function isAllowedMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // GCS public URL pattern: storage.googleapis.com/<bucket>/<path>
    // Used by backend uploads via firebase-admin (file.makePublic()).
    if (parsed.hostname === 'storage.googleapis.com') {
      return parsed.pathname.startsWith(`/${ALLOWED_BUCKET}/`);
    }

    return ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}
