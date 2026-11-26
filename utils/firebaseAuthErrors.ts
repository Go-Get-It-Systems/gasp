/** User-facing messages without echoing phone numbers, tokens or SDK request data. */
export function getPhoneAuthErrorMessage(
  error: unknown,
  fallback = 'Could not send verification code. Please try again.',
): string {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case 'auth/web-localhost-not-supported':
      return 'Phone sign-in on the web requires an authorized HTTPS domain. Open the app on that domain to continue.';
    case 'auth/web-auth-mode-mismatch':
      return 'Firebase Auth is still using a previous local session. Restart the web app, clear this site’s data, and sign in again.';
    case 'auth/web-config-missing':
    case 'auth/invalid-api-key':
    case 'app/no-app':
      return 'Phone sign-in is not configured for this website.';
    case 'auth/invalid-phone-number':
      return 'Invalid phone number. Please check and try again.';
    case 'auth/invalid-verification-code':
      return 'Invalid code. Please try again.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'Code expired. Please request a new one.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many attempts. Please try again later.';
    case 'auth/unauthorized-domain':
    case 'auth/invalid-app-credential':
    case 'auth/captcha-check-failed':
    case 'auth/missing-client-identifier':
      return 'App verification failed. Please use an authorized website and try again.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is currently unavailable. Please contact support.';
    case 'auth/network-request-failed':
      return 'Could not connect to the sign-in service. Check your connection and try again.';
    case 'auth/unsupported':
      return 'Phone sign-in is not supported in this environment.';
    default:
      return fallback;
  }
}
