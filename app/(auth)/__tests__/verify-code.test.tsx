import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import '@/lib/i18n';
import VerifyCodeScreen from '../verify-code';

const mockRequestPhoneVerification = jest.fn();
const mockConfirmPhoneVerification = jest.fn();
const mockLogin = jest.fn();

jest.mock('@/services/firebaseAuth', () => ({
  requestPhoneVerification: (...args: unknown[]) => mockRequestPhoneVerification(...args),
  confirmPhoneVerification: (...args: unknown[]) => mockConfirmPhoneVerification(...args),
  clearPhoneVerifier: jest.fn(),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ login: mockLogin }),
}));

jest.mock('@/services/api', () => ({
  getApiErrorMessage: () => 'The server could not complete login.',
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

describe('VerifyCodeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockRequestPhoneVerification.mockReset();
    mockConfirmPhoneVerification.mockReset();
    mockLogin.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps Resend disabled during the 30s cooldown', () => {
    const { getByText } = render(<VerifyCodeScreen />);
    fireEvent.press(getByText('Resend in 30s'));
    expect(mockRequestPhoneVerification).not.toHaveBeenCalled();
  });

  it('resends after the cooldown and verifies with the new verificationId', async () => {
    mockRequestPhoneVerification.mockResolvedValue({ verificationId: 'vid-2' });
    mockConfirmPhoneVerification.mockResolvedValue('firebase-token-fixture');
    mockLogin.mockResolvedValue(undefined);
    const { getByText, getByLabelText } = render(<VerifyCodeScreen />);

    for (let i = 0; i < 30; i++) act(() => { jest.advanceTimersByTime(1000); });
    await act(async () => { fireEvent.press(getByText('Resend')); });

    expect(mockRequestPhoneVerification).toHaveBeenCalledWith('+61400000001', true);
    expect(getByText('Resend in 30s')).toBeTruthy();

    await act(async () => { fireEvent.press(getByLabelText('submit-otp')); });
    expect(mockConfirmPhoneVerification).toHaveBeenCalledWith('vid-2', '123456');
    expect(mockLogin).toHaveBeenCalledWith('firebase-token-fixture');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/camera');
  });

  it('shows a failed resend inline and permits another attempt without restarting the cooldown', async () => {
    mockRequestPhoneVerification
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ verificationId: 'vid-retry' });
    render(<VerifyCodeScreen />);
    for (let i = 0; i < 30; i++) act(() => { jest.advanceTimersByTime(1000); });

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Resend' })); });

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resend' })).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Resend' })); });

    expect(mockRequestPhoneVerification).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Resend in 30s' })).toBeDisabled();
  });

  it('shows invalid codes inline without calling backend login and supports correcting the code', async () => {
    mockConfirmPhoneVerification
      .mockRejectedValueOnce(Object.assign(new Error('Invalid code'), {
        code: 'auth/invalid-verification-code',
      }))
      .mockResolvedValueOnce('firebase-token-fixture');
    mockLogin.mockResolvedValue(undefined);
    render(<VerifyCodeScreen />);

    await act(async () => { fireEvent.press(screen.getByLabelText('submit-otp')); });

    expect(screen.getByRole('alert')).toHaveTextContent(/Invalid code/);
    expect(mockLogin).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(screen.getByLabelText('submit-otp')); });

    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockLogin).toHaveBeenCalledWith('firebase-token-fixture');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/camera');
  });

  it('keeps backend login errors visible instead of navigating into the authenticated app', async () => {
    mockConfirmPhoneVerification.mockResolvedValue('firebase-token-fixture');
    mockLogin.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { message: 'Invalid Firebase token' } },
    });
    render(<VerifyCodeScreen />);

    await act(async () => { fireEvent.press(screen.getByLabelText('submit-otp')); });

    expect(screen.getByRole('alert')).toHaveTextContent('The server could not complete login.');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('routes an unregistered verified user to profile creation', async () => {
    mockConfirmPhoneVerification.mockResolvedValue('firebase-token-fixture');
    mockLogin.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { message: 'User not registered' } },
    });
    render(<VerifyCodeScreen />);

    await act(async () => { fireEvent.press(screen.getByLabelText('submit-otp')); });

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/(auth)/create-profile',
      params: { phoneNumber: '+61400000001' },
    });
  });
});
