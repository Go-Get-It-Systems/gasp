jest.mock('axios', () => {
  const instance = { interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } };
  return { create: jest.fn(() => instance), post: jest.fn(), isAxiosError: jest.fn() };
});
jest.mock('@/utils/storage', () => ({ getAuthToken: jest.fn(async () => 'synthetic-old-token'), setAuthToken: jest.fn(async () => {}), removeAuthToken: jest.fn(async () => {}) }));
import axios from 'axios';
import { api, registerAuthCallbacks, setApiToken } from '@/services/api';
import { advanceSession } from '@/services/session';
import { setAuthToken, removeAuthToken } from '@/utils/storage';
const request = (api.interceptors.request.use as jest.Mock).mock.calls[0][0];
const [success, failure] = (api.interceptors.response.use as jest.Mock).mock.calls[0];
const callbacks = { onTokenRefreshed: jest.fn(), onLogout: jest.fn() };
beforeEach(() => { jest.clearAllMocks(); advanceSession(); setApiToken('synthetic-A'); registerAuthCallbacks(callbacks); });
describe('F07: HTTP work belongs to its originating session', () => {
  test('a late successful response is rejected before it can reach a consumer', () => {
    const config = request({ url: '/conversations', headers: {} }); advanceSession(); setApiToken('synthetic-B');
    expect(() => success({ config, data: ['alice-private'] })).toThrow('The session changed');
  });
  test('a late 401 cannot refresh or log out the new account', async () => {
    const config = request({ url: '/conversations', headers: {} }); advanceSession(); setApiToken('synthetic-B');
    await expect(failure({ config, response: { status: 401 } })).rejects.toHaveProperty('name', 'StaleSessionError');
    expect(axios.post).not.toHaveBeenCalled(); expect(callbacks.onLogout).not.toHaveBeenCalled(); expect(removeAuthToken).not.toHaveBeenCalled();
  });
  test('an in-flight token refresh cannot resurrect the logged-out session', async () => {
    let finish!: (value: unknown) => void;
    (axios.post as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const config = request({ url: '/conversations', headers: {} });
    const refreshing = failure({ config, response: { status: 401 } }).catch((error: Error) => error);
    for (let i = 0; i < 12; i++) await Promise.resolve();
    advanceSession(); setApiToken('synthetic-B'); finish({ data: { token: 'synthetic-late-A' } });
    expect((await refreshing).name).toBe('StaleSessionError');
    expect(setAuthToken).not.toHaveBeenCalled(); expect(callbacks.onTokenRefreshed).not.toHaveBeenCalled(); expect(callbacks.onLogout).not.toHaveBeenCalled();
  });
  test('normal current-session responses continue to work', () => {
    const config = request({ url: '/conversations', headers: {} }); const response = { config, data: ['current'] };
    expect(success(response)).toBe(response);
  });
});
