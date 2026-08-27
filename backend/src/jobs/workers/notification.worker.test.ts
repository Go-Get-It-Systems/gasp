import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { NotificationEvent } from '../../shared/types.js';

let mockDevices: Array<{ fcmToken: string }> = [];
const mockWhereSelect = vi.fn(() => Promise.resolve(mockDevices));
const mockFromSelect = vi.fn(() => ({ where: mockWhereSelect }));
const mockSelect = vi.fn(() => ({ from: mockFromSelect }));
const mockWhereDelete = vi.fn(() => Promise.resolve());
const mockDelete = vi.fn(() => ({ where: mockWhereDelete }));
const mockShouldSuppressPushForUser = vi.fn();
const mockSendEachForMulticast = vi.fn();
const mockFetch = vi.fn();

vi.mock('../../config/env.js', () => ({
  env: { REDIS_URL: 'redis://localhost:6379' },
}));

vi.mock('../../config/database.js', () => ({
  db: {
    select: mockSelect,
    delete: mockDelete,
  },
}));

vi.mock('../../config/firebase.js', () => ({
  firebaseMessaging: {
    sendEachForMulticast: mockSendEachForMulticast,
  },
}));

vi.mock('../../socket/presence.gateway.js', () => ({
  shouldSuppressPushForUser: mockShouldSuppressPushForUser,
}));

const { processNotification } = await import('./notification.worker.js');

const event: NotificationEvent = {
  kind: 'gasp.received',
  recipientId: 'recipient-1',
  actorId: 'sender-1',
  actorName: 'Gabriel',
  title: 'Gabriel',
  body: 'sent you a gasp',
  route: '/(modals)/view-gasp?gaspId=gasp-1',
  gaspId: 'gasp-1',
  eventId: 'gasp-1',
};

function makeJob(data: NotificationEvent) {
  return { id: 'job-1', data } as any;
}

describe('processNotification', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockDevices = [];
    mockWhereSelect.mockClear();
    mockFromSelect.mockClear();
    mockSelect.mockClear();
    mockWhereDelete.mockClear();
    mockDelete.mockClear();
    mockShouldSuppressPushForUser.mockReset();
    mockShouldSuppressPushForUser.mockResolvedValue(false);
    mockSendEachForMulticast.mockReset();
    mockFetch.mockReset();
  });

  test('skips push when recipient app is foreground-active', async () => {
    mockShouldSuppressPushForUser.mockResolvedValue(true);

    await expect(processNotification(makeJob(event))).resolves.toEqual({
      skipped: true,
      reason: 'user_online',
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  test('skips push when recipient has no devices', async () => {
    mockDevices = [];

    await expect(processNotification(makeJob(event))).resolves.toEqual({
      skipped: true,
      reason: 'no_devices',
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  test('sends canonical notification fields to FCM data payload', async () => {
    mockDevices = [{ fcmToken: 'token-1' }];
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    await expect(processNotification(makeJob(event))).resolves.toEqual({
      sent: 1,
      failed: 0,
      invalidTokensRemoved: 0,
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(expect.objectContaining({
      tokens: ['token-1'],
      notification: { title: 'Gabriel', body: 'sent you a gasp' },
      data: expect.objectContaining({
        kind: 'gasp.received',
        route: '/(modals)/view-gasp?gaspId=gasp-1',
        recipientId: 'recipient-1',
        actorId: 'sender-1',
        actorName: 'Gabriel',
        gaspId: 'gasp-1',
        eventId: 'gasp-1',
      }),
      apns: expect.objectContaining({
        payload: expect.objectContaining({
          aps: expect.objectContaining({ sound: 'default' }),
        }),
      }),
    }));
  });

  test('sends Expo push tokens through Expo push API', async () => {
    mockDevices = [{ fcmToken: 'ExpoPushToken[ios-token-1]' }];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ status: 'ok' }] }),
    });

    await expect(processNotification(makeJob(event))).resolves.toEqual({
      sent: 1,
      failed: 0,
      invalidTokensRemoved: 0,
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(String(init.body));
    expect(body).toEqual([expect.objectContaining({
      to: 'ExpoPushToken[ios-token-1]',
      title: 'Gabriel',
      body: 'sent you a gasp',
      sound: 'default',
      data: expect.objectContaining({
        kind: 'gasp.received',
        gaspId: 'gasp-1',
      }),
    })]);
  });

  test('removes invalid FCM tokens', async () => {
    mockDevices = [{ fcmToken: 'bad-token' }];
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [{
        success: false,
        error: {
          code: 'messaging/registration-token-not-registered',
          message: 'not registered',
        },
      }],
    });

    await processNotification(makeJob(event));

    expect(mockDelete).toHaveBeenCalled();
    expect(mockWhereDelete).toHaveBeenCalled();
  });
});
