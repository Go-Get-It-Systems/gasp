import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Platform } from 'react-native';
import CreateProfileScreen from '../create-profile';

const mockGetFirebaseIdToken = jest.fn();
const mockRegister = jest.fn();

jest.mock('@/services/firebaseAuth', () => ({
  getFirebaseIdToken: (...args: unknown[]) => mockGetFirebaseIdToken(...args),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ register: mockRegister, isLoading: false }),
}));

jest.mock('@/services/api', () => ({
  getApiErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Registration failed.',
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({
    phoneNumber: '+61400000001',
    firebaseToken: 'untrusted-url-token',
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/business/AccountTypeChoice', () => ({
  AccountTypeChoice: () => null,
}));

function fillValidProfile(): void {
  fireEvent.changeText(screen.getByPlaceholderText('Your name'), '  Alex Morgan  ');
  fireEvent.changeText(screen.getByPlaceholderText('your_username'), 'Alex_Morgan');
}

describe('CreateProfileScreen on web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFirebaseIdToken.mockReset().mockResolvedValue('session-id-token');
    mockRegister.mockReset().mockResolvedValue(undefined);
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers with the current session token and keeps it out of navigation', async () => {
    render(<CreateProfileScreen />);
    fillValidProfile();

    await act(async () => { fireEvent.press(screen.getByText("Let's go!")); });

    expect(mockGetFirebaseIdToken).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledWith({
      firebaseToken: 'session-id-token',
      displayName: 'Alex Morgan',
      username: 'alex_morgan',
      accountType: 'personal',
    });
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/camera');
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows an expired session instead of registering from a URL token', async () => {
    mockGetFirebaseIdToken.mockResolvedValue(null);
    render(<CreateProfileScreen />);
    fillValidProfile();

    await act(async () => { fireEvent.press(screen.getByText("Let's go!")); });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your verification session expired. Please verify your phone again.',
    );
    expect(mockRegister).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText("Let's go!")).toBeTruthy();
  });

  it('shows backend errors inline and permits retry without navigating', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Username already taken.'));
    render(<CreateProfileScreen />);
    fillValidProfile();

    await act(async () => { fireEvent.press(screen.getByText("Let's go!")); });

    expect(screen.getByRole('alert')).toHaveTextContent('Username already taken.');
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(screen.getByText("Let's go!")); });

    expect(mockRegister).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('submits only once while reading the Firebase session is pending', async () => {
    let resolveToken: ((token: string) => void) | undefined;
    mockGetFirebaseIdToken.mockImplementationOnce(() => new Promise<string>((resolve) => {
      resolveToken = resolve;
    }));
    render(<CreateProfileScreen />);
    fillValidProfile();
    let submit = screen.getByText("Let's go!");
    while (submit.parent && typeof submit.props.onPress !== 'function') {
      submit = submit.parent;
    }
    expect(submit.props.onPress).toEqual(expect.any(Function));
    const onPress: () => void = submit.props.onPress;

    // Two queued presses can reach the same handler before disabled UI commits.
    act(() => {
      onPress();
      onPress();
    });

    expect(mockGetFirebaseIdToken).toHaveBeenCalledTimes(1);
    expect(mockRegister).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();

    await act(async () => { resolveToken?.('session-id-token'); });

    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});
