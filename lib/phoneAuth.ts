/**
 * Phone Auth — Native implementation (iOS/Android)
 * Uses @react-native-firebase/auth v23 modular API.
 */
import { getApp } from '@react-native-firebase/app';
import {
    getAuth,
    PhoneAuthProvider,
    signInWithCredential,
    signInWithPhoneNumber,
    type FirebaseAuthTypes,
} from '@react-native-firebase/auth';

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

function getFirebaseAuth() {
  return getAuth(getApp());
}

/**
 * Send SMS verification code to the given phone number.
 * Returns a verificationId to be used in confirmCode().
 */
export async function sendVerificationCode(phoneNumber: string): Promise<string> {
  const confirmation = await signInWithPhoneNumber(getFirebaseAuth(), phoneNumber);
  confirmationResult = confirmation;
  return confirmation.verificationId;
}

/**
 * Confirm the 6-digit code and return the Firebase ID token for backend auth.
 */
export async function confirmCode(verificationId: string, code: string): Promise<string> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const userCredential = await signInWithCredential(getFirebaseAuth(), credential);
  const firebaseToken = await userCredential.user.getIdToken();
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
