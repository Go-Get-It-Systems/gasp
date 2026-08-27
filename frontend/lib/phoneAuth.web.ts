/**
 * Phone Auth — Web implementation
 * Uses the Firebase JS SDK with reCAPTCHA verifier for phone authentication.
 */
import {
    PhoneAuthProvider,
    RecaptchaVerifier,
    signInWithCredential,
    signInWithPhoneNumber,
    type ConfirmationResult,
} from 'firebase/auth';
import { auth } from './firebase.web';

let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Create a fresh reCAPTCHA verifier, removing any previous one first.
 */
function createFreshRecaptcha(): RecaptchaVerifier {
  // Always clean up previous instance to avoid "already rendered" error
  cleanupRecaptcha();

  // Remove old container from DOM if it exists
  const containerId = 'recaptcha-container';
  const oldContainer = document.getElementById(containerId);
  if (oldContainer) {
    oldContainer.remove();
  }

  // Create a brand new container
  const container = document.createElement('div');
  container.id = containerId;
  container.style.display = 'none';
  document.body.appendChild(container);

  recaptchaVerifier = new RecaptchaVerifier(auth, container, {
    size: 'invisible',
  });

  return recaptchaVerifier;
}

/**
 * No-op on web — reCAPTCHA is created lazily in sendVerificationCode().
 */
export function setupRecaptcha(_containerId: string): void {
  // Lazy initialization — done in sendVerificationCode
}

/**
 * Clean up the reCAPTCHA verifier (e.g., on unmount).
 */
export function cleanupRecaptcha(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // Ignore
    }
    recaptchaVerifier = null;
  }
}

/**
 * Send SMS verification code to the given phone number.
 * Returns a verificationId to be used in confirmCode().
 */
export async function sendVerificationCode(phoneNumber: string): Promise<string> {
  const verifier = createFreshRecaptcha();

  console.log('[phoneAuth.web] Sending verification code to:', phoneNumber);
  try {
    const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    confirmationResult = result;
    console.log('[phoneAuth.web] Verification sent successfully');
    return result.verificationId;
  } catch (error: any) {
    console.error('[phoneAuth.web] signInWithPhoneNumber failed:', error);
    // Reset reCAPTCHA on failure so it can be recreated on retry
    cleanupRecaptcha();
    throw error;
  }
}

/**
 * Confirm the 6-digit code and return the Firebase ID token for backend auth.
 */
export async function confirmCode(verificationId: string, code: string): Promise<string> {
  console.log('[phoneAuth.web] Confirming code...');

  // Try stored confirmationResult first (same page session)
  if (confirmationResult) {
    try {
      const userCredential = await confirmationResult.confirm(code);
      if (!userCredential.user) throw new Error('No user returned after confirmation');
      const firebaseToken = await userCredential.user.getIdToken();
      console.log('[phoneAuth.web] Code confirmed via confirmationResult');
      return firebaseToken;
    } catch (error) {
      console.warn('[phoneAuth.web] confirmationResult.confirm failed, trying credential fallback:', error);
    }
  }

  // Fallback: use credential-based sign in (works even if confirmationResult is lost)
  console.log('[phoneAuth.web] Using PhoneAuthProvider.credential fallback');
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const userCredential = await signInWithCredential(auth, credential);
  const firebaseToken = await userCredential.user.getIdToken();
  console.log('[phoneAuth.web] Code confirmed via credential fallback');
  return firebaseToken;
}
