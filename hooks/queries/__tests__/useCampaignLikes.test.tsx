import React, { type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCampaignLikes } from '../useCampaignLikes';
import { advanceSession } from '@/services/session';
import { getCampaignLikes, setCampaignLike } from '@/services/api/business';

jest.unmock('@tanstack/react-query');
let mockActor = 'bi';
let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('@/hooks/queries/useBusiness', () => ({ useBusinessActor: () => mockActor }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ user: mockActor ? { id: mockActor } : null }) } }));
jest.mock('@/services/api/business', () => ({ getCampaignLikes: jest.fn(), setCampaignLike: jest.fn() }));
const getLikes = getCampaignLikes as jest.Mock;
const setLike = setCampaignLike as jest.Mock;
let client: QueryClient;
function wrapper({ children }: PropsWithChildren) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
beforeEach(() => {
  jest.clearAllMocks(); mockActor = 'bi'; mockFocused = true; advanceSession();
  AppState.currentState = 'active';
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  getLikes.mockResolvedValue({ count: 3, liked: false });
  setLike.mockResolvedValue({ count: 4, liked: true });
});
afterEach(() => { client.clear(); jest.restoreAllMocks(); jest.useRealTimers(); });

it('refreshes other accounts likes while visible, pauses offscreen/background and refreshes on return', async () => {
  jest.useFakeTimers();
  let onState!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    onState = handler; return { remove };
  });
  const screen = renderHook(() => useCampaignLikes('w', 'c'), { wrapper });
  await waitFor(() => expect(screen.result.current.count).toBe(3));
  getLikes.mockResolvedValue({ count: 4, liked: false });
  await act(async () => { await jest.advanceTimersByTimeAsync(5_000); });
  expect(screen.result.current.count).toBe(4);
  expect(screen.result.current.liked).toBe(false);
  act(() => onState('background'));
  const calls = getLikes.mock.calls.length;
  await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
  expect(getLikes).toHaveBeenCalledTimes(calls);
  getLikes.mockResolvedValue({ count: 5, liked: false });
  act(() => onState('active'));
  await waitFor(() => expect(screen.result.current.count).toBe(5));
  mockFocused = false; screen.rerender({});
  const hiddenCalls = getLikes.mock.calls.length;
  await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
  expect(getLikes).toHaveBeenCalledTimes(hiddenCalls);
  expect(remove).toHaveBeenCalledTimes(1);
  getLikes.mockResolvedValue({ count: 6, liked: false });
  mockFocused = true; screen.rerender({});
  await waitFor(() => expect(screen.result.current.count).toBe(6));
  screen.unmount();
  const unmountedCalls = getLikes.mock.calls.length;
  await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
  expect(getLikes).toHaveBeenCalledTimes(unmountedCalls);
});

it('pauses refresh during a write and stops polling when access is denied', async () => {
  jest.useFakeTimers();
  const request = deferred<{ count: number; liked: boolean }>();
  setLike.mockReturnValueOnce(request.promise);
  const { result } = renderHook(() => useCampaignLikes('w', 'c'), { wrapper });
  await waitFor(() => expect(result.current.count).toBe(3));
  act(() => result.current.toggle());
  await waitFor(() => expect(setLike).toHaveBeenCalledTimes(1));
  const calls = getLikes.mock.calls.length;
  await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
  expect(getLikes).toHaveBeenCalledTimes(calls);
  expect(result.current.count).toBe(4);
  await act(async () => request.resolve({ count: 4, liked: true }));
  await waitFor(() => expect(result.current.isPending).toBe(false));
  getLikes.mockRejectedValue({ response: { status: 403 } });
  await act(async () => { await jest.advanceTimersByTimeAsync(5_000); });
  await waitFor(() => expect(result.current.hasData).toBe(false));
  const deniedCalls = getLikes.mock.calls.length;
  await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
  expect(getLikes).toHaveBeenCalledTimes(deniedCalls);
});

it('optimistically likes once despite rapid taps, restores on failure, retries and unlikes', async () => {
  const request = deferred<{ count: number; liked: boolean }>(); setLike.mockReturnValueOnce(request.promise);
  const { result } = renderHook(() => useCampaignLikes('w', 'c'), { wrapper });
  await waitFor(() => expect(result.current.count).toBe(3));
  act(() => { result.current.toggle(); result.current.toggle(); });
  await waitFor(() => expect(result.current.count).toBe(4));
  expect(setLike).toHaveBeenCalledTimes(1);
  await act(async () => request.reject(new Error('network')));
  await waitFor(() => expect(result.current.count).toBe(3));
  expect(result.current.liked).toBe(false);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.isPending).toBe(false));
  await waitFor(() => expect(result.current.count).toBe(4));
  setLike.mockResolvedValueOnce({ count: 3, liked: false });
  act(() => result.current.toggle());
  await waitFor(() => expect(result.current.liked).toBe(false));
  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(setLike).toHaveBeenLastCalledWith('w', 'c', false);
});

it('does not present loading failures as zero likes or allow a write', async () => {
  getLikes.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useCampaignLikes('w', 'c'), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.hasData).toBe(false);
  act(() => result.current.toggle());
  expect(setLike).not.toHaveBeenCalled();
  getLikes.mockResolvedValue({ count: 9, liked: false });
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.count).toBe(9));
});

it('stops writes after access is revoked and rechecks access on retry', async () => {
  setLike.mockRejectedValue({ response: { status: 403 } });
  const { result } = renderHook(() => useCampaignLikes('w', 'c'), { wrapper });
  await waitFor(() => expect(result.current.count).toBe(3));
  act(() => result.current.toggle());
  await waitFor(() => expect(result.current.accessDenied).toBe(true));
  expect(result.current.disabled).toBe(true);
  getLikes.mockRejectedValue({ response: { status: 403 } });
  act(() => result.current.retry());
  await waitFor(() => expect(getLikes).toHaveBeenCalledTimes(2));
  expect(setLike).toHaveBeenCalledTimes(1);
});

it('ignores a late mutation after logout, including login again as the same user', async () => {
  const request = deferred<{ count: number; liked: boolean }>(); setLike.mockReturnValueOnce(request.promise);
  const first = renderHook(() => useCampaignLikes('w', 'c'), { wrapper });
  await waitFor(() => expect(first.result.current.count).toBe(3));
  act(() => first.result.current.toggle());
  await waitFor(() => expect(setLike).toHaveBeenCalledTimes(1));
  first.unmount(); advanceSession();
  getLikes.mockResolvedValue({ count: 7, liked: false });
  const second = renderHook(() => useCampaignLikes('w', 'c'), { wrapper });
  await waitFor(() => expect(second.result.current.count).toBe(7));
  await act(async () => request.resolve({ count: 4, liked: true }));
  expect(second.result.current.count).toBe(7);
  expect(second.result.current.liked).toBe(false);
});

it('isolates campaign and account query data and disables unauthenticated requests', async () => {
  const first = renderHook(() => useCampaignLikes('w', 'c'), { wrapper });
  await waitFor(() => expect(first.result.current.count).toBe(3)); first.unmount();
  mockActor = 'iaco'; advanceSession(); getLikes.mockResolvedValue({ count: 8, liked: true });
  const second = renderHook(() => useCampaignLikes('w2', 'c2'), { wrapper });
  await waitFor(() => expect(second.result.current.count).toBe(8));
  expect(getLikes).toHaveBeenLastCalledWith('w2', 'c2'); second.unmount();
  mockActor = ''; advanceSession();
  renderHook(() => useCampaignLikes('w', 'c'), { wrapper });
  expect(getLikes).toHaveBeenCalledTimes(2);
});
