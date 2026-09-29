import fc from 'fast-check';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
    easConfig: { projectId: 'test-project-id' },
  },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/services/notificationNavigation', () => ({
  openNotificationRoute: jest.fn(),
}));

jest.mock('@/services/api/devices', () => ({
  registerDevice: jest.fn(() => Promise.resolve()),
}));

// Import after mocks are declared (jest.mock is hoisted anyway)
import { registerDevice } from '@/services/api/devices';
import { openNotificationRoute } from '@/services/notificationNavigation';
import { openLastNotificationResponseIfAny, registerIfNeeded, resolveDeepLink } from '@/services/pushService';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockedRegisterDevice = registerDevice as jest.Mock;

// SecureStore is already mocked in jest.setup.js
const SecureStore = require('expo-secure-store') as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  SecureStore.getItemAsync.mockReset();
  SecureStore.setItemAsync.mockReset();
  SecureStore.deleteItemAsync.mockReset();
});

// ── Property-Based Tests ─────────────────────────────────────────────────────

describe('Property-Based Tests', () => {
  // Feature: gasp-notifications, Property 7: Deep link resolution is total and correct
  it('Property 7: resolveDeepLink returns a non-empty string starting with the expected path prefix and containing the relevant ID', () => {
    const idArb = fc.uuid();

    fc.assert(
      fc.property(idArb, (id) => {
        expect(resolveDeepLink({ kind: 'gasp.received', gaspId: id })).toBe(`/(modals)/view-gasp?gaspId=${id}`);
        expect(resolveDeepLink({ kind: 'message.new', conversationId: id })).toBe(`/chat/${id}`);
        expect(resolveDeepLink({
          kind: 'gasp.reaction_received',
          conversationId: id,
          reactionMessageId: id,
        })).toContain(`/chat/${id}`);
      })
    );
  });

  it('uses Expo push token registration on iOS because Firebase Admin cannot send APNs tokens directly', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const expoToken = 'ExpoPushToken[ios-token-123]';

    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      expires: 'never',
      granted: true,
      canAskAgain: true,
    } as any);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: expoToken,
      type: 'expo',
    } as any);
    SecureStore.getItemAsync.mockResolvedValue(null);

    await registerIfNeeded();

    expect(mockedNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project-id' });
    expect(mockedNotifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
    expect(mockedRegisterDevice).toHaveBeenCalledWith(expoToken, 'ios');
  });

  // Feature: gasp-notifications, Property 8: FCM token registration calls API with correct token
  it('Property 8: registerIfNeeded calls registerDevice exactly once with the exact token value when no stored token exists', async () => {
    const tokenArb = fc.string({ minLength: 1, maxLength: 200 }).filter(
      (s) => s.trim().length > 0
    );

    await fc.assert(
      fc.asyncProperty(tokenArb, async (token) => {
        // Reset mocks for each property run
        mockedRegisterDevice.mockClear();
        mockedRegisterDevice.mockResolvedValue(undefined);
        SecureStore.getItemAsync.mockResolvedValue(null); // no stored token
        SecureStore.setItemAsync.mockResolvedValue(undefined);

        mockedNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'granted',
          expires: 'never',
          granted: true,
          canAskAgain: true,
        } as any);
        mockedNotifications.getDevicePushTokenAsync.mockResolvedValue({
          data: token,
          type: 'android',
        } as any);

        await registerIfNeeded();

        // registerDevice should be called exactly once with the exact token
        expect(mockedRegisterDevice).toHaveBeenCalledTimes(1);
        expect(mockedRegisterDevice).toHaveBeenCalledWith(token, expect.any(String));
      })
    );
  });
});

// ── Unit Tests ───────────────────────────────────────────────────────────────

describe('resolveDeepLink', () => {
  it('returns view-gasp route for kind "gasp.received" with gaspId', () => {
    const result = resolveDeepLink({ kind: 'gasp.received', gaspId: 'abc-123' });
    expect(result).toBe('/(modals)/view-gasp?gaspId=abc-123');
  });

  it('returns chat route for kind "message.new" with conversationId', () => {
    const result = resolveDeepLink({ kind: 'message.new', conversationId: 'conv-456' });
    expect(result).toBe('/chat/conv-456');
  });

  it('preserves sender metadata for message notification chat routes', () => {
    const result = resolveDeepLink({
      kind: 'message.new',
      conversationId: 'conv-456',
      actorName: 'Alex Gasp',
      actorAvatarUrl: 'https://example.com/alex.jpg',
    });

    expect(result).toBe('/chat/conv-456?name=Alex+Gasp&avatarUrl=https%3A%2F%2Fexample.com%2Falex.jpg');
  });

  it('returns chat-first reaction route with reaction context and actor metadata', () => {
    const result = resolveDeepLink({
      kind: 'gasp.reaction_received',
      gaspId: 'gasp-789',
      conversationId: 'conv-789',
      reactionMessageId: 'reaction-message-1',
      actorName: 'Alex',
      actorAvatarUrl: 'https://example.com/alex.jpg',
    });
    expect(result).toBe('/chat/conv-789?highlightMessageId=reaction-message-1&name=Alex&avatarUrl=https%3A%2F%2Fexample.com%2Falex.jpg');
  });

  it('returns inbox fallback when a reaction notification lacks conversation context', () => {
    expect(resolveDeepLink({ kind: 'gasp.reaction_received', gaspId: 'gasp-789' })).toBe('/(tabs)/inbox');
  });

  it('opens incoming friend requests in the inbox', () => {
    expect(resolveDeepLink({ kind: 'friend.request' })).toBe('/(tabs)/inbox');
  });

  it('opens the chat continuation surface for an accepted friend request', () => {
    expect(resolveDeepLink({ kind: 'friend.accepted' })).toBe('/(tabs)/chat');
  });

  it('returns view-gasp route for legacy type "reminder" with gaspId', () => {
    const result = resolveDeepLink({ type: 'reminder', gaspId: 'gasp-reminder-1' });
    expect(result).toBe('/(modals)/view-gasp?gaspId=gasp-reminder-1');
  });

  it('returns fallback /(tabs)/inbox for unknown kind', () => {
    const result = resolveDeepLink({ type: 'unknown' as any });
    expect(result).toBe('/(tabs)/inbox');
  });

  it('returns fallback when required ID is missing for gasp kind', () => {
    const result = resolveDeepLink({ kind: 'gasp.received' });
    expect(result).toBe('/(tabs)/inbox');
  });
});

describe('registerIfNeeded', () => {
  beforeEach(() => {
    mockedRegisterDevice.mockClear();
    mockedRegisterDevice.mockResolvedValue(undefined);
  });

  it('does not call registerDevice when permission is denied (req 5.3)', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'denied',
      expires: 'never',
      granted: false,
      canAskAgain: true,
    } as any);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'denied',
      expires: 'never',
      granted: false,
      canAskAgain: false,
    } as any);

    await registerIfNeeded();

    expect(mockedRegisterDevice).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pushPermissionDenied', 'true');
  });

  it('skips registerDevice when stored token is unchanged (req 5.7)', async () => {
    const existingToken = 'existing-token-xyz';

    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      expires: 'never',
      granted: true,
      canAskAgain: true,
    } as any);
    mockedNotifications.getDevicePushTokenAsync.mockResolvedValue({
      data: existingToken,
      type: 'android',
    } as any);
    SecureStore.getItemAsync.mockResolvedValue(existingToken);

    await registerIfNeeded();

    expect(mockedRegisterDevice).not.toHaveBeenCalled();
  });

  it('calls registerDevice when token changes (req 5.7)', async () => {
    const oldToken = 'old-token-aaa';
    const newToken = 'new-token-bbb';

    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      expires: 'never',
      granted: true,
      canAskAgain: true,
    } as any);
    mockedNotifications.getDevicePushTokenAsync.mockResolvedValue({
      data: newToken,
      type: 'android',
    } as any);
    SecureStore.getItemAsync.mockResolvedValue(oldToken);

    await registerIfNeeded();

    expect(mockedRegisterDevice).toHaveBeenCalledTimes(1);
    expect(mockedRegisterDevice).toHaveBeenCalledWith(newToken, expect.any(String));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('fcm_token', newToken);
  });

  it('foreground suppression is configured at module load (req 5.5)', () => {
    // setNotificationHandler is called at module load time.
    // Since beforeEach clears mocks, we verify with a fresh module require.
    jest.resetModules();

    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: jest.fn(),
      requestPermissionsAsync: jest.fn(),
      getDevicePushTokenAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn(),
      setNotificationHandler: jest.fn(),
      addNotificationResponseReceivedListener: jest.fn(),
      getLastNotificationResponseAsync: jest.fn(),
    }));
    jest.doMock('expo-router', () => ({ router: { push: jest.fn() } }));
    jest.doMock('@/services/api/devices', () => ({
      registerDevice: jest.fn(() => Promise.resolve()),
    }));
    jest.doMock('@/services/notificationHelpers', () => ({
      formatReminderMessage: jest.fn((name: string) => `${name} is waiting for your reaction`),
    }));

    const freshNotifications = require('expo-notifications');
    require('@/services/pushService');

    expect(freshNotifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(freshNotifications.setNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        handleNotification: expect.any(Function),
      })
    );
  });
});

describe('openLastNotificationResponseIfAny', () => {
  it('opens the route from the last notification response once auth/root is ready', async () => {
    mockedNotifications.getLastNotificationResponseAsync.mockResolvedValue({
      notification: {
        request: {
          identifier: 'notification-1',
          content: {
            data: {
              kind: 'message.new',
              conversationId: 'conv-1',
              actorName: 'Alex',
            },
          },
        },
      },
    } as any);

    await openLastNotificationResponseIfAny();

    expect(openNotificationRoute).toHaveBeenCalledWith('/chat/conv-1?name=Alex');
  });
});
