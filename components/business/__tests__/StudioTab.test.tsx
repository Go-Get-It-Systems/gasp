import { render } from '@testing-library/react-native';
import * as mockReactNative from 'react-native';
import StudioTab from '@/app/(tabs)/studio';

let mockAccountType: string | undefined | null;
const mockStudioMounted = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (select: (state: unknown) => unknown) => select({
    user: mockAccountType === null ? null : { id: 'account-1', accountType: mockAccountType },
  }),
}));
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <mockReactNative.Text>{`redirect:${href}`}</mockReactNative.Text>,
}));
jest.mock('../StudioSession', () => ({
  StudioSession: () => { mockStudioMounted(); return <mockReactNative.Text>Original Studio</mockReactNative.Text>; },
}));

beforeEach(() => { jest.clearAllMocks(); mockAccountType = 'business'; });

it.each(['personal', undefined, null])('blocks Studio for %s before mounting its session', (type) => {
  mockAccountType = type;
  const screen = render(<StudioTab />);
  expect(screen.getByText('redirect:/(tabs)/profile')).toBeTruthy();
  expect(mockStudioMounted).not.toHaveBeenCalled();
});

it('mounts the unchanged Studio only for a business account', () => {
  const screen = render(<StudioTab />);
  expect(screen.getByText('Original Studio')).toBeTruthy();
  expect(mockStudioMounted).toHaveBeenCalledTimes(1);
  mockAccountType = 'personal';
  screen.rerender(<StudioTab />);
  expect(screen.queryByText('Original Studio')).toBeNull();
  expect(screen.getByText('redirect:/(tabs)/profile')).toBeTruthy();
});
