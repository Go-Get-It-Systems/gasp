/**
 * Firebase Auth helpers — Web implementation
 * Used by authStore for session management (sign out, token refresh).
 */
import { signOut } from 'firebase/auth';
import { auth } from './firebase.web';

export async function signOutFirebase(): Promise<void> {
  if (auth.currentUser) {
    await signOut(auth);
  }
}

/**
 * Attempt to silently refresh the Firebase ID token using an existing session.
 * Returns null if no active Firebase session exists.
 */
export async function getRefreshedFirebaseToken(): Promise<string | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  return firebaseUser.getIdToken(/* forceRefresh */ true);
}
