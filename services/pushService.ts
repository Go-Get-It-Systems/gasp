import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { registerDevice } from '@/services/api/devices';
import { openNotificationRoute } from '@/services/notificationNavigation';
import {
  resolveNotificationRoute,
  type LegacyNotificationType,
  type NotificationRoutePayload,
  type NotificationType,
} from '@/services/notificationRouting';
import { formatReminderMessage as _formatReminderMessage } from '@/services/notificationHelpers';

// ── Types ────────────────────────────────────────────────────────────────────

export type { NotificationType } from '@/services/notificationRouting';
export type DeepLinkPayload = NotificationRoutePayload;

export interface PushNotificationData {
  kind?: NotificationType;
  type?: NotificationType | LegacyNotificationType;
  route?: string;
  gaspId?: string;
  conversationId?: string;
  reactionId?: string;
  reactionMessageId?: string;
  senderName?: string;
  actorName?: string;
  actorAvatarUrl?: string;
}

// ── Module-level setup ───────────────────────────────────────────────────────

// Show native banners only when app is in background/inactive — in foreground
// the ToastBanner component handles notifications instead (Requirement 5.5)
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const appState = require('react-native').AppState.currentState;
    const isBackground = appState === 'background' || appState === 'inactive';
    return {
      shouldShowAlert: isBackground,
      shouldPlaySound: isBackground,
      shouldSetBadge: true,
      shouldShowBanner: isBackground,
      shouldShowList: isBackground,
    };
  },
});

// Handle notification taps — satisfies Requirement 5.4
Notifications.addNotificationResponseReceivedListener((response) => {
  openNotificationResponse(response);
});

let lastOpenedNotificationId: string | null = null;

function openNotificationResponse(response: Notifications.NotificationResponse | null | undefined) {
  if (!response) return;

  const notificationId = response.notification.request.identifier;
  if (notificationId && notificationId === lastOpenedNotificationId) return;
  lastOpenedNotificationId = notificationId ?? null;

  const data = response.notification.request.content.data as unknown as PushNotificationData;
  const route = resolveNotificationRoute(data);
  openNotificationRoute(route);
}

export async function openLastNotificationResponseIfAny(): Promise<void> {
  try {
    openNotificationResponse(await Notifications.getLastNotificationResponseAsync());
  } catch (error) {
    Sentry.captureException(error, {
      extra: { context: 'pushService.openLastNotificationResponseIfAny' },
    });
  }
}

const EAS_PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
export const resolveDeepLink = resolveNotificationRoute;

// ── Exported Functions ───────────────────────────────────────────────────────

/** Returns true if push notification permission is currently granted. */
export async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Requests push permission (if needed), obtains the FCM device token,
 * and registers it with the backend when new or changed.
 *
 * Satisfies Requirements 5.2, 5.3, 5.7
 */
export async function registerIfNeeded(): Promise<void> {
  // 1. Check current permission status
  let { status } = await Notifications.getPermissionsAsync();
  if (__DEV__) console.tronLog?.log('[PushService] permission status:', status);

  // If not granted, request permission
  if (status !== 'granted') {
    const response = await Notifications.requestPermissionsAsync();
    status = response.status;
    if (__DEV__) console.tronLog?.log('[PushService] permission after request:', status);
  }

  // 2. If still not granted: log denial and persist flag — no retry (Requirement 5.3)
  if (status !== 'granted') {
    Sentry.captureMessage('Push notification permission denied', {
      level: 'info',
      extra: { context: 'pushService.registerIfNeeded' },
    });
    console.warn('[PushService] Notification permission denied');
    await SecureStore.setItemAsync('pushPermissionDenied', 'true');
    return;
  }

  // 3. Obtain push token. Android uses native FCM tokens for Firebase Admin.
  // iOS uses Expo push tokens because getDevicePushTokenAsync returns APNs tokens,
  // which Firebase Admin cannot send to as multicast FCM tokens.
  let token: string;
  try {
    if (Platform.OS === 'ios') {
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
      );
      token = tokenResponse.data;
    } else {
      const tokenResponse = await Notifications.getDevicePushTokenAsync();
      token = tokenResponse.data;
    }
    if (__DEV__) console.tronLog?.log('[PushService] push token obtained:', token.slice(0, 20) + '...');
  } catch (error) {
    // 6. Token fetch failure: log and return silently
    // 'status' is already in scope (~line 126) from the permission check above.
    // Avoids an extra async call inside catch that could itself throw and break silencing.
    if (__DEV__) console.tronLog?.error('[PushService] getDevicePushTokenAsync failed:', error);
    Sentry.captureException(error, {
      extra: {
        context: 'pushService.registerIfNeeded.getDevicePushToken',
        permissionStatus: status,
      },
    });
    return;
  }

  // 4. Compare with stored token — only register if changed or absent (Requirements 5.2, 5.7)
  const storedToken = await SecureStore.getItemAsync('fcm_token');
  if (__DEV__) console.tronLog?.log('[PushService] stored token match:', storedToken === token);

  if (storedToken !== token) {
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    if (__DEV__) console.tronLog?.log('[PushService] registering device with backend...', { platform });

    try {
      await registerDevice(token, platform);
      if (__DEV__) console.tronLog?.log('[PushService] device registered successfully ✅');
    } catch (error) {
      // 7. registerDevice failure: log and clear cached token to force retry on next launch
      if (__DEV__) console.tronLog?.error('[PushService] registerDevice failed:', error);
      Sentry.captureException(error, {
        extra: { context: 'pushService.registerIfNeeded.registerDevice' },
      });
      await SecureStore.deleteItemAsync('fcm_token');
      return;
    }

    // 5. Persist new token
    await SecureStore.setItemAsync('fcm_token', token);
  }
}

/** Formats a reminder nudge message — delegates to notificationHelpers. */
export function formatReminderMessage(senderName: string): string {
  return _formatReminderMessage(senderName);
}
