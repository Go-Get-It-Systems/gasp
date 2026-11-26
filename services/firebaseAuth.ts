import {
  getAuth,
  getIdToken,
  PhoneAuthProvider,
  signInWithCredential,
  signOut,
} from '@react-native-firebase/auth';

export async function requestPhoneVerification(
  phoneNumber: string,
  forceResend = false,
): Promise<{ verificationId: string }> {
  const auth = getAuth();
  auth.settings.forceRecaptchaFlowForTesting = false;
  // RNFirebase 23.8.8's modular wrapper drops its fourth forceResend argument.
  // The public instance method forwards this flag to the native SDK correctly.
  const confirmation = await auth.signInWithPhoneNumber(phoneNumber, forceResend);
  const verificationId = confirmation.verificationId;
  if (!verificationId) {
    throw Object.assign(new Error('Firebase did not return a phone verification ID. Please request a new code.'), {
      code: 'auth/missing-verification-id',
    });
  }
  return { verificationId };
}

export async function confirmPhoneVerification(
  verificationId: string,
  code: string,
): Promise<string> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const result = await signInWithCredential(getAuth(), credential);
  return getIdToken(result.user);
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const user = getAuth().currentUser;
  return user ? getIdToken(user, forceRefresh) : null;
}

export async function signOutFirebase(): Promise<void> {
  const auth = getAuth();
  if (auth.currentUser) await signOut(auth);
}

export function clearPhoneVerifier(): void {
  // Native Firebase owns app verification and has no DOM verifier to dispose.
}
