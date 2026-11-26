import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import PhoneLoginScreen from '../phone-login';

const mockRequestPhoneVerification = jest.fn();
const mockClearPhoneVerifier = jest.fn();

jest.mock('@/services/firebaseAuth', () => ({
  requestPhoneVerification: (...args: unknown[]) => mockRequestPhoneVerification(...args),
  clearPhoneVerifier: () => mockClearPhoneVerifier(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', regionCode: 'AU' }],
}));

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Search: () => null,
  X: () => null,
  ChevronDown: () => null,
}));

describe('PhoneLoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPhoneVerification.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('prevents duplicate SMS requests and opens verification only after a successful request', async () => {
    let resolveRequest!: (value: { verificationId: string }) => void;
    mockRequestPhoneVerification.mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    render(<PhoneLoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Phone number'), '400000001');

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(mockRequestPhoneVerification).toHaveBeenCalledTimes(1);
    expect(mockRequestPhoneVerification).toHaveBeenCalledWith('+61400000001');
    expect(router.push).not.toHaveBeenCalled();

    await act(async () => { resolveRequest({ verificationId: 'verification-1' }); });

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(auth)/verify-code',
      params: { phoneNumber: '+61400000001', verificationId: 'verification-1' },
    });
  });

  it('shows the localhost restriction in the screen without navigating and clears it when editing', async () => {
    mockRequestPhoneVerification.mockRejectedValue(Object.assign(new Error('Unsupported origin'), {
      code: 'auth/web-localhost-not-supported',
    }));
    render(<PhoneLoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Phone number'), '400000001');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/authorized HTTPS domain/i);
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText('Phone number'), '400000002');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('allows retry after a failed request instead of leaving Continue stuck', async () => {
    mockRequestPhoneVerification
      .mockRejectedValueOnce(Object.assign(new Error('Network unavailable'), {
        code: 'auth/network-request-failed',
      }))
      .mockResolvedValueOnce({ verificationId: 'verification-retry' });
    render(<PhoneLoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Phone number'), '400000001');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    });

    expect(mockRequestPhoneVerification).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('does not navigate if verification completes after leaving the phone screen', async () => {
    let resolveRequest!: (value: { verificationId: string }) => void;
    mockRequestPhoneVerification.mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    const { unmount } = render(<PhoneLoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Phone number'), '400000001');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    unmount();
    await act(async () => { resolveRequest({ verificationId: 'verification-late' }); });

    expect(mockClearPhoneVerifier).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
