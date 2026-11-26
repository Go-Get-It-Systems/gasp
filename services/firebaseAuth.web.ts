// RNFirebase already installs Firebase JS. Keep access to this SDK bridge in
// this adapter so web auth does not mix RNFirebase and Firebase JS instances.
import {
  getApps,
  getAuth,
  getIdToken,
  initializeApp,
  connectAuthEmulator,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut,
  type Auth,
} from '@react-native-firebase/app/dist/module/internal/web/firebaseAuth';

interface VerifierHandle {
  verifier: RecaptchaVerifier;
  container: HTMLElement;
}

interface VerificationOperation {
  promise: Promise<{ verificationId: string }>;
  cancel: () => void;
}

let authInstance: Auth | null = null;
let activeVerifier: VerifierHandle | null = null;
let verificationOperation: VerificationOperation | null = null;

function authError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function hasBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function authEmulatorRequested(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR === 'true';
}

function assertAuthMode(auth: Auth): void {
  const emulatorConnected = Boolean(auth.emulatorConfig);
  if (emulatorConnected !== authEmulatorRequested()) {
    throw authError(
      'auth/web-auth-mode-mismatch',
      'Firebase Auth is connected to a different local mode than configured. Restart the web app and clear its site data, then sign in again.',
    );
  }
}

function getBrowserAuth(): Auth {
  if (!hasBrowser()) {
    throw authError(
      'auth/operation-not-supported-in-this-environment',
      'Phone verification is only available in the browser.',
    );
  }
  if (authInstance) {
    assertAuthMode(authInstance);
    return authInstance;
  }

  // Expo replaces only static process.env.EXPO_PUBLIC_* references in bundles.
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
  const names = {
    apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
    authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    storageBucket: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
  };
  const missing = (Object.keys(config) as (keyof typeof config)[])
    .filter((key) => !config[key]?.trim())
    .map((key) => names[key]);
  if (missing.length > 0) {
    throw authError(
      'auth/web-config-missing',
      `Firebase web configuration is incomplete: ${missing.join(', ')}.`,
    );
  }

  const app = getApps().find((existing) => existing.name === '[DEFAULT]')
    ?? initializeApp(config);
  authInstance = getAuth(app);
  if (authEmulatorRequested()) {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099');
  }
  assertAuthMode(authInstance);
  return authInstance;
}

function assertPhoneOrigin(auth: Auth | null): void {
  if (!hasBrowser()) return;
  const hostname = window.location.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isLocal = hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname === '::1'
    || hostname === '0.0.0.0'
    || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  if (isLocal && !auth?.emulatorConfig) {
    throw authError(
      'auth/web-localhost-not-supported',
      'Firebase phone sign-in requires an authorized hosted domain. SMS cannot be sent from localhost. Open the app on an authorized domain or explicitly connect an Auth Emulator.',
    );
  }
}

function disposeVerifier(handle: VerifierHandle): void {
  try {
    handle.verifier.clear();
  } catch {
    // Remove our container even when Firebase has already cleared its widget.
  }
  handle.container.remove();
  if (activeVerifier === handle) activeVerifier = null;
}

function createVerifier(auth: Auth): VerifierHandle {
  const container = document.createElement('div');
  container.id = 'gasp-phone-recaptcha';
  document.body.appendChild(container);
  try {
    const verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
    const handle = { verifier, container };
    activeVerifier = handle;
    return handle;
  } catch (error) {
    container.remove();
    throw error;
  }
}

export function clearPhoneVerifier(): void {
  const operation = verificationOperation;
  verificationOperation = null;
  operation?.cancel();
  if (activeVerifier) disposeVerifier(activeVerifier);
}

export function requestPhoneVerification(
  phoneNumber: string,
  _forceResend = false,
): Promise<{ verificationId: string }> {
  // Repeated clicks share one challenge and one SMS request. A later resend
  // creates a fresh verifier; Firebase JS has no native forceResend flag.
  if (verificationOperation) return verificationOperation.promise;

  let cancel: () => void = () => {};
  const cancellation = new Promise<never>((_resolve, reject) => {
    cancel = () => reject(authError(
      'auth/web-verification-cancelled',
      'Phone verification was cancelled.',
    ));
  });
  // Cancellation can happen before the deferred operation starts.
  void cancellation.catch(() => {});

  const operation: VerificationOperation = {
    cancel,
    promise: Promise.resolve().then(async () => {
      let handle: VerifierHandle | null = null;
      try {
        // A local origin is rejected before Firebase initialization unless the
        // explicit dev-only emulator flag is enabled. With that flag, initialize
        // Auth, connect it to the emulator, then verify the connection before use.
        const useAuthEmulator = __DEV__
          && process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR === 'true';
        if (!useAuthEmulator) assertPhoneOrigin(authInstance);
        const auth = getBrowserAuth();
        assertPhoneOrigin(auth);
        await Promise.race([auth.authStateReady(), cancellation]);
        if (verificationOperation !== operation) {
          throw authError('auth/web-verification-cancelled', 'Phone verification was cancelled.');
        }
        handle = createVerifier(auth);
        const result = await Promise.race([
          signInWithPhoneNumber(auth, phoneNumber, handle.verifier),
          cancellation,
        ]);
        return { verificationId: result.verificationId };
      } finally {
        if (handle && activeVerifier === handle) disposeVerifier(handle);
        if (verificationOperation === operation) verificationOperation = null;
      }
    }),
  };
  verificationOperation = operation;
  return operation.promise;
}

export async function confirmPhoneVerification(
  verificationId: string,
  code: string,
): Promise<string> {
  const auth = getBrowserAuth();
  await auth.authStateReady();
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const result = await signInWithCredential(auth, credential);
  return getIdToken(result.user, true);
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  if (!hasBrowser()) return null;
  const auth = getBrowserAuth();
  await auth.authStateReady();
  return auth.currentUser ? getIdToken(auth.currentUser, forceRefresh) : null;
}

export async function signOutFirebase(): Promise<void> {
  clearPhoneVerifier();
  if (!hasBrowser()) return;
  const auth = getBrowserAuth();
  await auth.authStateReady();
  if (auth.currentUser) await signOut(auth);
}
