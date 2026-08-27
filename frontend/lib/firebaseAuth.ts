/**
 * Firebase Auth helpers — Native implementation (iOS/Android)
 * Used by authStore for session management (sign out, token refresh).
 */
import { getAuth, signOut as firebaseSignOut } from '@react-native-firebase/auth';

export async function signOutFirebase(): Promise<void> {
  const auth = getAuth();
  if (auth.currentUser) {
    await firebaseSignOut(auth);
  }
}

/**
 * Attempt to silently refresh the Firebase ID token using an existing session.
 * Returns null if no active Firebase session exists.
 */
export async function getRefreshedFirebaseToken(): Promise<string | null> {
  const auth = getAuth();
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  return firebaseUser.getIdToken(/* forceRefresh */ true);
}
