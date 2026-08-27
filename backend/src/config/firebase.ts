import admin from 'firebase-admin';
import { env } from './env.js';

function getCredential(): admin.credential.Credential {
  // Service account credentials: FIREBASE_PRIVATE_KEY must be a PEM key (starts with "-----BEGIN")
  if (
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY &&
    env.FIREBASE_PRIVATE_KEY.includes('BEGIN')
  ) {
    return admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  // Try GOOGLE_APPLICATION_CREDENTIALS env var or metadata server (Cloud Run, etc.)
  try {
    return admin.credential.applicationDefault();
  } catch {
    // Fallback: no credential - Firebase Admin will work in limited mode
    console.warn(
      '⚠️  Firebase Admin: No valid credentials found.\n' +
      '   To fix: download a service account key from Firebase Console > Project Settings > Service Accounts.\n' +
      '   Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env'
    );
    return admin.credential.applicationDefault();
  }
}

let app: admin.app.App;
let firebaseInitialized = false;

try {
  app = admin.initializeApp({
    credential: getCredential(),
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET ?? `${env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
  });
  firebaseInitialized = true;
} catch (err) {
  console.warn('⚠️  Firebase Admin initialization failed:', (err as Error).message);
  console.warn('   Server will start but Firebase features (auth verification, push notifications) will not work.');
  app = admin.initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
}

export const firebaseAuth: admin.auth.Auth = admin.auth(app);
export const firebaseMessaging: admin.messaging.Messaging = admin.messaging(app);
export const firebaseStorage: admin.storage.Storage = admin.storage(app);
export { firebaseInitialized };
