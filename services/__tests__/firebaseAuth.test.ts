import {
  clearPhoneVerifier,
  confirmPhoneVerification,
  getFirebaseIdToken,
  requestPhoneVerification,
  signOutFirebase,
} from '../firebaseAuth';

const mockNativeUser = { uid: 'native-user' };
const mockNativeAuth = {
  settings: { forceRecaptchaFlowForTesting: true },
  currentUser: mockNativeUser as typeof mockNativeUser | null,
  signInWithPhoneNumber: jest.fn(),
};
const mockGetIdToken = jest.fn();
const mockSignInWithCredential = jest.fn();
const mockCredential = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => mockNativeAuth,
  getIdToken: (...args: unknown[]) => mockGetIdToken(...args),
  signInWithCredential: (...args: unknown[]) => mockSignInWithCredential(...args),
  PhoneAuthProvider: { credential: (...args: unknown[]) => mockCredential(...args) },
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

describe('native Firebase auth adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNativeAuth.currentUser = mockNativeUser;
    mockNativeAuth.settings.forceRecaptchaFlowForTesting = true;
    mockNativeAuth.signInWithPhoneNumber.mockResolvedValue({ verificationId: 'native-verification' });
    mockCredential.mockReturnValue({ providerId: 'phone', verificationId: 'native-verification' });
    mockSignInWithCredential.mockResolvedValue({ user: mockNativeUser });
    mockGetIdToken.mockResolvedValue('native-id-token');
    mockSignOut.mockResolvedValue(undefined);
  });

  it('requests verification through the public native method and forwards forceResend', async () => {
    await expect(requestPhoneVerification('+15555550123')).resolves.toEqual({
      verificationId: 'native-verification',
    });
    expect(mockNativeAuth.signInWithPhoneNumber).toHaveBeenLastCalledWith('+15555550123', false);
    expect(mockNativeAuth.settings.forceRecaptchaFlowForTesting).toBe(false);

    await requestPhoneVerification('+15555550123', true);
    expect(mockNativeAuth.signInWithPhoneNumber).toHaveBeenLastCalledWith('+15555550123', true);
  });

  it('confirms the supplied code and returns the Firebase ID token', async () => {
    await expect(confirmPhoneVerification('native-verification', '123456'))
      .resolves.toBe('native-id-token');
    expect(mockCredential).toHaveBeenCalledWith('native-verification', '123456');
    expect(mockSignInWithCredential).toHaveBeenCalledWith(mockNativeAuth, {
      providerId: 'phone', verificationId: 'native-verification',
    });
    expect(mockGetIdToken).toHaveBeenCalledWith(mockNativeUser);
  });

  it('rejects a native response without a verification ID instead of simulating SMS success', async () => {
    mockNativeAuth.signInWithPhoneNumber.mockResolvedValueOnce({ verificationId: null });
    await expect(requestPhoneVerification('+15555550123')).rejects.toMatchObject({
      code: 'auth/missing-verification-id',
    });
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
    expect(mockGetIdToken).not.toHaveBeenCalled();
  });

  it('refreshes an existing session and returns null without a user', async () => {
    await expect(getFirebaseIdToken(true)).resolves.toBe('native-id-token');
    expect(mockGetIdToken).toHaveBeenCalledWith(mockNativeUser, true);
    mockNativeAuth.currentUser = null;
    await expect(getFirebaseIdToken()).resolves.toBeNull();
    expect(mockGetIdToken).toHaveBeenCalledTimes(1);
  });

  it('signs out only an existing session and has no DOM verifier to clean', async () => {
    await signOutFirebase();
    expect(mockSignOut).toHaveBeenCalledWith(mockNativeAuth);
    mockNativeAuth.currentUser = null;
    await signOutFirebase();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(() => clearPhoneVerifier()).not.toThrow();
  });
});
