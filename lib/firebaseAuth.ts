/**
 * Firebase Auth helpers — Native implementation (iOS/Android)
 * Used by authStore for session management (sign out, token refresh).
 */
import { getApp } from '@react-native-firebase/app';
import { signOut as firebaseSignOut, getAuth } from '@react-native-firebase/auth';

function getFirebaseAuth() {
  return getAuth(getApp());
}

export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    await firebaseSignOut(auth);
  }
}

/**
 * Attempt to silently refresh the Firebase ID token using an existing session.
 * Returns null if no active Firebase session exists.
 */
export async function getRefreshedFirebaseToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  return firebaseUser.getIdToken(/* forceRefresh */ true);
}
