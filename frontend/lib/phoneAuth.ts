/**
 * Phone Auth — Native implementation (iOS/Android)
 * Uses @react-native-firebase/auth which interfaces with the native Firebase SDK.
 */
import {
  getAuth,
  signInWithPhoneNumber,
  signInWithCredential,
  PhoneAuthProvider,
  getIdToken,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

/**
 * Send SMS verification code to the given phone number.
 * Returns a verificationId to be used in confirmCode().
 */
export async function sendVerificationCode(phoneNumber: string): Promise<string> {
  const firebaseAuth = getAuth();
  firebaseAuth.settings.forceRecaptchaFlowForTesting = false;

  const confirmation = await signInWithPhoneNumber(firebaseAuth, phoneNumber);
  confirmationResult = confirmation;
  return confirmation.verificationId;
}

/**
 * Confirm the 6-digit code and return the Firebase ID token for backend auth.
 */
export async function confirmCode(verificationId: string, code: string): Promise<string> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const userCredential = await signInWithCredential(getAuth(), credential);
  const firebaseToken = await getIdToken(userCredential.user);
  return firebaseToken;
}

/**
 * No-op on native — reCAPTCHA is not needed (Play Integrity / APNs handles it).
 */
export function setupRecaptcha(_containerId: string): void {
  // No-op on native
}

/**
 * Clean up (no-op on native).
 */
export function cleanupRecaptcha(): void {
  // No-op on native
}
