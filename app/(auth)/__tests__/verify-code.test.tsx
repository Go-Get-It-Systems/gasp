import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

const mockSignInWithPhoneNumber = jest.fn();
const mockSignInWithCredential = jest.fn((..._args: unknown[]) => new Promise(() => {}));
const mockCredential = jest.fn((..._args: unknown[]) => ({}));

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithPhoneNumber: (...args: unknown[]) => mockSignInWithPhoneNumber(...args),
  signInWithCredential: (...args: unknown[]) => mockSignInWithCredential(...args),
  getIdToken: jest.fn(),
  PhoneAuthProvider: { credential: (...args: unknown[]) => mockCredential(...args) },
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ phoneNumber: '+61400000001', verificationId: 'vid-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

jest.mock('@/components/auth/OtpInput', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    OtpInput: ({ onComplete }: { onComplete: (code: string) => void }) => (
      <Pressable accessibilityRole="button" accessibilityLabel="submit-otp" onPress={() => onComplete('123456')}>
        <Text>otp</Text>
      </Pressable>
    ),
  };
});

import '@/lib/i18n';
import VerifyCodeScreen from '../verify-code';

describe('VerifyCodeScreen resend', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.useRealTimers());

  it('keeps Resend disabled during the 30s cooldown', () => {
    const { getByText } = render(<VerifyCodeScreen />);
    fireEvent.press(getByText('Resend in 30s'));
    expect(mockSignInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it('resends after the cooldown and verifies with the new verificationId', async () => {
    mockSignInWithPhoneNumber.mockResolvedValue({ verificationId: 'vid-2' });
    const { getByText, getByLabelText } = render(<VerifyCodeScreen />);

    for (let i = 0; i < 30; i++) act(() => { jest.advanceTimersByTime(1000); });
    await act(async () => { fireEvent.press(getByText('Resend')); });

    expect(mockSignInWithPhoneNumber).toHaveBeenCalledWith({}, '+61400000001', undefined, true);
    expect(getByText('Resend in 30s')).toBeTruthy();

    await act(async () => { fireEvent.press(getByLabelText('submit-otp')); });
    expect(mockCredential).toHaveBeenCalledWith('vid-2', '123456');
  });
});
