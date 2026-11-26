import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAutoDownload } from '../useAutoDownload';
import { usePendingGasps } from '@/hooks/queries/useGasps';
import { cacheMedia } from '@/services/mediaCache';

let mockAuthState = { isInitialized: false, isAuthenticated: false, token: null as string | null };
const mockGasps = [{
  id: 'gasp-1',
  mediaType: 'image',
  imageUri: 'https://media.example/image.jpg',
  expiresAt: '2030-01-01T00:00:00Z',
}];
const mockShouldAutoDownload = jest.fn(() => true);

jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
    { getState: () => mockAuthState },
  ),
}));
jest.mock('@/hooks/queries/useGasps', () => ({
  // Include old query data even when disabled, as React Query can do on logout.
  usePendingGasps: jest.fn(() => ({ data: mockGasps })),
}));
jest.mock('@/stores/mediaCacheStore', () => ({
  useMediaCacheStore: { getState: () => ({ shouldAutoDownload: mockShouldAutoDownload }) },
}));
jest.mock('@/services/mediaCache', () => ({ cacheMedia: jest.fn(() => Promise.resolve('file://cached.jpg')) }));
jest.mock('@react-native-community/netinfo', () => ({ fetch: jest.fn(() => Promise.resolve({ type: 'wifi' })) }));

describe('automatic offline downloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockAuthState = { isInitialized: false, isAuthenticated: false, token: null };
  });

  afterEach(() => jest.restoreAllMocks());

  it('does not request pending media or process old query data before authentication', async () => {
    const { rerender } = renderHook(() => useAutoDownload());
    expect(usePendingGasps).toHaveBeenLastCalledWith(false);
    mockAuthState = { isInitialized: true, isAuthenticated: false, token: null };
    rerender({});
    expect(usePendingGasps).toHaveBeenLastCalledWith(false);
    expect(NetInfo.fetch).not.toHaveBeenCalled();
    expect(cacheMedia).not.toHaveBeenCalled();
  });

  it('enables native downloads only after session restoration and keeps preference checks', async () => {
    const { rerender } = renderHook(() => useAutoDownload());
    mockAuthState = { isInitialized: true, isAuthenticated: true, token: 'session-1' };
    rerender({});
    expect(usePendingGasps).toHaveBeenLastCalledWith(true);
    await waitFor(() => expect(cacheMedia).toHaveBeenCalledWith(mockGasps[0].imageUri, mockGasps[0].expiresAt));
    expect(mockShouldAutoDownload).toHaveBeenCalledWith('image', 'wifi');
    rerender({});
    expect(cacheMedia).toHaveBeenCalledTimes(1);
  });

  it('does not prefetch or query offline media on web even for a restored session', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    mockAuthState = { isInitialized: true, isAuthenticated: true, token: 'session-1' };
    renderHook(() => useAutoDownload());
    expect(usePendingGasps).toHaveBeenLastCalledWith(false);
    expect(NetInfo.fetch).not.toHaveBeenCalled();
    expect(cacheMedia).not.toHaveBeenCalled();
  });

  it('ignores an in-flight network check after logout', async () => {
    let finishNetworkCheck: (value: { type: string }) => void = () => {};
    jest.mocked(NetInfo.fetch).mockImplementationOnce(() => new Promise((resolve) => {
      finishNetworkCheck = resolve as typeof finishNetworkCheck;
    }));
    mockAuthState = { isInitialized: true, isAuthenticated: true, token: 'session-1' };
    const { rerender } = renderHook(() => useAutoDownload());
    mockAuthState = { isInitialized: true, isAuthenticated: false, token: null };
    rerender({});
    await act(async () => finishNetworkCheck({ type: 'wifi' }));
    expect(cacheMedia).not.toHaveBeenCalled();
  });
});
