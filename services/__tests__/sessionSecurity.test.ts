jest.unmock('@tanstack/react-query');
jest.mock('@/services/api', () => ({ setApiToken: jest.fn(), registerAuthCallbacks: jest.fn() }));
jest.mock('@/services/api/auth', () => ({ login: jest.fn(), logout: jest.fn(), register: jest.fn() }));
jest.mock('@/services/api/users', () => ({ getMe: jest.fn() }));
jest.mock('@/services/socket', () => ({ connectSocket: jest.fn(), disconnectSocket: jest.fn() }));
jest.mock('@/services/mediaCache', () => ({ clearAllCache: jest.fn(async () => {}) }));
jest.mock('@/services/uploadQueue', () => ({ clearUploadQueue: jest.fn(async () => {}) }));

import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useGaspStore } from '@/stores/gaspStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useCameraStore } from '@/stores/cameraStore';
import { advanceSession, setSessionActor } from '@/services/session';
import { clearAllCache } from '@/services/mediaCache';
import { clearUploadQueue } from '@/services/uploadQueue';
import { disconnectSocket } from '@/services/socket';
import * as authApi from '@/services/api/auth';
import * as SecureStore from 'expo-secure-store';

const token = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE4OTM0NTYwMDB9.synthetic';
const user = (id: string) => ({ id, displayName: id, username: id, avatarUrl: null, createdAt: '2026-01-01T00:00:00Z' });
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
beforeEach(() => {
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, gcTime: 0, retry: false } });
  jest.clearAllMocks(); queryClient.clear(); advanceSession(); setSessionActor('alice');
  useAuthStore.setState({ user: user('alice'), token, isAuthenticated: true, isInitialized: true });
  (authApi.logout as jest.Mock).mockResolvedValue(undefined);
  (clearAllCache as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => queryClient.clear());

describe('F07: session isolation with the real QueryClient', () => {
  test('clears private data immediately even while server logout is pending', async () => {
    let release!: () => void;
    (authApi.logout as jest.Mock).mockReturnValueOnce(new Promise<void>(resolve => { release = resolve; }));
    queryClient.setQueryData(['conversations'], [{ id: 'alice-chat' }]);
    queryClient.setQueryData(['messages', 'chat'], [{ content: 'alice-private' }]);
    useChatStore.setState({ activeConversationId: 'alice-chat', typingUsers: [{ conversationId: 'chat', userId: 'bob' }] });
    useGaspStore.setState({ reactions: [{ id: 'private-reaction' }] as never[], viewedGaspUrls: { private: true } });
    useInboxStore.setState({ friends: [{ id: 'private-friend' }] as never[], friendCount: 1 });
    useNotificationStore.setState({ activeToast: { id: 'private' } as never, toastQueue: [{ id: 'other' }] as never[] });
    useCameraStore.setState({ lastCapturedUri: 'file:///private-capture.jpg' });
    const logout = useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useChatStore.getState().activeConversationId).toBeNull();
    expect(useGaspStore.getState().reactions).toEqual([]);
    expect(useInboxStore.getState().friends).toEqual([]);
    expect(useNotificationStore.getState().activeToast).toBeNull();
    expect(useCameraStore.getState().lastCapturedUri).toBeNull();
    expect(disconnectSocket).toHaveBeenCalled(); expect(clearAllCache).toHaveBeenCalled(); expect(clearUploadQueue).toHaveBeenCalled();
    release(); await logout;
  });
  test('a late query result cannot repopulate cleared messages', async () => {
    let finish!: (value: string[]) => void;
    const fetching = queryClient.fetchQuery({ queryKey: ['messages', 'chat'], queryFn: () => new Promise<string[]>(resolve => { finish = resolve; }), retry: false }).catch(() => undefined);
    await flush(); await useAuthStore.getState().logout();
    finish(['alice-private']); await fetching; await flush();
    expect(queryClient.getQueryData(['messages', 'chat'])).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
  test('query hashes isolate the same query key between login lifetimes', () => {
    queryClient.setQueryData(['conversations'], ['alice-private']);
    advanceSession(); setSessionActor('bob');
    expect(queryClient.getQueryData(['conversations'])).toBeUndefined();
    queryClient.setQueryData(['conversations'], ['bob-private']);
    expect(queryClient.getQueryData(['conversations'])).toEqual(['bob-private']);
  });
  test('A logout B login fetches B without inheriting A data', async () => {
    queryClient.setQueryData(['conversations'], ['alice-private']);
    await useAuthStore.getState().logout();
    (authApi.login as jest.Mock).mockResolvedValueOnce({ user: user('bob'), token });
    await useAuthStore.getState().login('synthetic-firebase');
    const load = jest.fn(async () => ['bob-private']);
    expect(await queryClient.fetchQuery({ queryKey: ['conversations'], queryFn: load })).toEqual(['bob-private']);
    expect(load).toHaveBeenCalledTimes(1); expect(useAuthStore.getState().user?.id).toBe('bob');
  });
  test('a login response arriving after logout cannot restore A', async () => {
    let finish!: (value: unknown) => void;
    (authApi.login as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const loggingIn = useAuthStore.getState().login('synthetic-firebase').catch(error => error);
    await flush(); await useAuthStore.getState().logout();
    finish({ user: user('alice'), token });
    expect((await loggingIn).name).toBe('StaleSessionError');
    expect(useAuthStore.getState().user).toBeNull(); expect(useAuthStore.getState().token).toBeNull();
  });
  test('network and disk cleanup failures never retain in-memory private data', async () => {
    (authApi.logout as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    (clearAllCache as jest.Mock).mockRejectedValueOnce(new Error('disk unavailable'));
    queryClient.setQueryData(['messages', 'chat'], ['private']);
    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0); expect(useAuthStore.getState().user).toBeNull();
  });
  test('a delayed token setter cannot reactivate a session after logout', async () => {
    let finish!: () => void;
    (SecureStore.setItemAsync as jest.Mock).mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const setting = useAuthStore.getState().setToken(token).catch(error => error);
    await flush(); const loggingOut = useAuthStore.getState().logout();
    finish(); expect((await setting).name).toBe('StaleSessionError'); await loggingOut;
    expect(useAuthStore.getState().isAuthenticated).toBe(false); expect(useAuthStore.getState().token).toBeNull();
  });
});
