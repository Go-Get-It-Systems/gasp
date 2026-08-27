# Requirements Document

## Introduction

The Gasp Notification MVP delivers a simple, reliable notification system across all five event types the app produces: new messages, received gasps, received reactions, friend requests, and friend acceptances. Notifications must work correctly whether the app is in the foreground, backgrounded, or fully closed, without producing duplicate signals or navigating to the wrong screen.

The system builds on existing infrastructure: a BullMQ-backed notification queue on the backend, Socket.IO real-time events for online users, FCM/APNs push for offline users, a Zustand-managed toast queue on the frontend, and the `useSocketListeners` hook that keeps the React Query cache in sync.

Known bugs that fall in scope:
- `app/_layout.tsx` calls `useSocketListeners`, `useOnlineStatus`, and `useAutoDownload` twice each.
- `pushService.ts` routes gasp notifications to `/(modals)/gasp-viewer` instead of the real route `/(modals)/view-gasp`.
- Frontend notification type names (`gasp`, `message`, `reaction`) differ from backend type names (`gasp_received`, `new_message`, `reaction_received`).
- `ToastBanner` is hard-coded to gasp-only display and navigation.
- No Android notification channel is configured in the app.

Out of scope for this MVP: notification preferences screen, complex batching strategies, scheduled reminders, notification history inbox, rich media push previews.

---

## Glossary

- **Notification_System**: The end-to-end subsystem covering event emission, push delivery, socket delivery, in-app toast display, and deep-link navigation.
- **App**: The React Native / Expo mobile application.
- **Backend**: The Node.js / Fastify server.
- **Notification_Queue**: The BullMQ queue named `notifications` that serialises push delivery jobs.
- **Notification_Worker**: The BullMQ worker that reads from the Notification_Queue and dispatches FCM/APNs pushes.
- **Presence_Service**: The backend socket/Redis presence layer (`presence.gateway.ts`) that determines if a user currently has an active Socket.IO connection.
- **Socket_Service**: The Socket.IO layer used for real-time delivery to online users.
- **Push_Service**: The `pushService.ts` module plus associated `expo-notifications` configuration; handles permission, token registration, and deep-link resolution.
- **Toast_Banner**: The `ToastBanner` component that renders an animated slide-in banner for foreground notifications.
- **Toast_Queue**: The FIFO queue inside `notificationStore` that serialises multiple simultaneous toasts.
- **Notification_Store**: The Zustand store `notificationStore.ts` that owns the Toast_Queue, tab badge state, and unread indicators.
- **Socket_Listeners**: The `useSocketListeners` hook that registers Socket.IO event handlers and updates the React Query cache.
- **Root_Layout**: The `RootContent` component inside `app/_layout.tsx` that mounts global UI and registers hooks.
- **Deep_Link_Resolver**: The `resolveDeepLink` function in `pushService.ts` that maps a notification payload to an in-app route.
- **NotificationEvent**: The canonical event shape carrying `kind`, `recipientId`, `actorId`, `actorName`, `title`, `body`, `route`, and optional `conversationId`, `gaspId`, `reactionId`, `eventId`.
- **NotificationKind**: One of `message.new`, `gasp.received`, `gasp.reaction_received`, `friend.request`, `friend.accepted` — used consistently across frontend and backend.
- **Online_User**: A user whose Socket.IO connection is currently active as determined by the Presence_Service.
- **Offline_User**: A user with no active Socket.IO connection at the moment the event is triggered, as determined by the Presence_Service.
- **Android_Notification_Channel**: An Android-required notification channel declared in `app.json` and configured in the Notification_Worker.
- **Device_Token**: An FCM (Android) or APNs (iOS) push token registered by the App and stored in the `devices` table.
- **Sender**: The user who originates an action (sends a message, sends a gasp, reacts to a gasp, sends a friend request).
- **Recipient**: The user who receives the notification for an action.

---

## Requirements

### Requirement 1: Canonical Notification Event Shape

**User Story:** As a developer, I want a single, consistent event shape used by both frontend and backend, so that I can add new notification types without mapping or translation layers.

#### Acceptance Criteria

1. THE Notification_System SHALL define a `NotificationEvent` TypeScript interface shared by both the backend serialiser and the frontend deserialiser, with the fields: `kind` (NotificationKind), `recipientId` (string), `actorId` (string), `actorName` (string), `title` (string), `body` (string), `route` (string), `eventId` (string), and optional `conversationId`, `gaspId`, `reactionId` (all strings).
2. THE Notification_System SHALL use `message.new`, `gasp.received`, `gasp.reaction_received`, `friend.request`, and `friend.accepted` as the canonical values for `kind` on both frontend and backend; legacy names such as `gasp_received`, `new_message`, and `reaction_received` SHALL be removed.
3. WHEN the backend emits a socket event or enqueues a push job, THE Backend SHALL use the canonical `kind` value and SHALL populate the `route` field with the destination path the App must navigate to.
4. WHEN the App receives a push notification or socket event, THE App SHALL use the `route` field from the NotificationEvent directly as the navigation target.
5. WHEN the App receives a NotificationEvent with an unknown `kind`, THE Deep_Link_Resolver SHALL return the fallback route `/(tabs)/inbox` and log a Sentry warning.
6. WHEN the App receives a NotificationEvent missing a required field (`kind`, `recipientId`, `title`, `body`, or `route`), THE App SHALL log a Sentry warning with the invalid payload as extra context and navigate to `/(tabs)/inbox`.

---

### Requirement 2: Socket Listener Singleton Registration

**User Story:** As a developer, I want socket listeners registered exactly once per session, so that duplicate events do not trigger duplicate cache updates, duplicate toasts, or duplicate unread increments.

#### Acceptance Criteria

1. THE Root_Layout SHALL call `useSocketListeners`, `useOnlineStatus`, and `useAutoDownload` exactly once each for any contiguous period during which `isAuthenticated` remains `true`.
2. THE `useSocketListeners`, `useOnlineStatus`, and `useAutoDownload` hooks SHALL each be called in exactly one location within the app's React render tree; no other component may call these hooks.
3. WHEN the same socket event is received more than once with the same event identifier (the unique ID present in the event payload), THE Socket_Listeners SHALL leave the React Query cache in the same state as if the event had been received only once.
4. WHEN a toast is about to be enqueued, THE Toast_Queue SHALL check both `activeToast.id` and each entry in `toastQueue` for a matching `id`; if a match is found the new toast SHALL be discarded without being added.

---

### Requirement 3: Foreground Notification Delivery

**User Story:** As a user with the app open, I want to see an in-app signal for every new message, gasp, and reaction, so that I am aware of activity without being interrupted by a native OS banner.

#### Acceptance Criteria

1. WHEN a `gasp.received` socket event arrives and `AppState.currentState === 'active'`, THE Toast_Banner SHALL display a toast for that event for 4000 milliseconds before auto-dismissing.
2. WHEN a `gasp.reaction_received` socket event arrives and `AppState.currentState === 'active'`, THE Toast_Banner SHALL display a toast for that event for 4000 milliseconds before auto-dismissing.
3. WHEN a `message.new` socket event arrives and `AppState.currentState === 'active'` and the `conversationId` does not match `chatStore.activeConversationId`, THE Toast_Banner SHALL display a toast for that event for 4000 milliseconds before auto-dismissing.
4. WHEN a `message.new` socket event arrives and `AppState.currentState === 'active'` and the `conversationId` matches `chatStore.activeConversationId`, THE Socket_Listeners SHALL update `lastMessage`, `lastMessageAt`, and the message list in the React Query cache without enqueuing a toast and without incrementing `unreadCount`.
5. WHILE `AppState.currentState === 'active'`, THE Push_Service notification handler SHALL return `shouldShowAlert: false` and `shouldShowBanner: false` for all NotificationKind values.
6. WHEN a `gasp.received` socket event arrives, THE Notification_Store SHALL call `triggerTabPulse()` to update the Gasps tab indicator.
7. WHEN a `message.new` socket event arrives with a `conversationId` that does not match the active conversation, THE Notification_Store SHALL call `setChatHasUnread(true)` to update the Chat tab indicator.

---

### Requirement 4: Generic Toast Banner

**User Story:** As a user, I want the in-app toast to work for messages, reactions, and friend events — not just gasps — so that I receive visible signals for all notification types.

#### Acceptance Criteria

1. THE `ToastItem` interface SHALL include `id` (string), `title` (string), `body` (string), `route` (string), and optional `imageUri` (string) and `blurhash` (string).
2. THE Toast_Banner SHALL render the `title` field as the primary text and the `body` field as the secondary text from the active `ToastItem`, replacing the current hard-coded "New Gasp" label.
3. WHEN the user taps the Toast_Banner, THE Toast_Banner SHALL call `router.push(activeToast.route)` using the `route` field from the active `ToastItem`.
4. WHEN `activeToast.blurhash` is absent or empty, THE Toast_Banner SHALL render a solid `colors.surfaceElevated` background and SHALL NOT attempt to render an `Image` or `BlurView` for the background.
5. THE Toast_Banner SHALL display toasts for all NotificationKind values: `message.new`, `gasp.received`, `gasp.reaction_received`, `friend.request`, and `friend.accepted`.

---

### Requirement 5: Background and Closed-App Push Delivery

**User Story:** As a user with the app backgrounded or closed, I want to receive a native push notification for every new message, gasp, reaction, and friend event, so that I am alerted even when not actively using the app.

#### Acceptance Criteria

1. WHEN a NotificationEvent is created and the Recipient app is foreground active on the same conversation or viewing context, THE Backend/App SHALL deliver only realtime UI/cache updates and SHALL NOT show a native OS banner.
2. WHEN a NotificationEvent is created and the Recipient app is foreground active but not on the relevant conversation or viewing context, THE App SHALL show an in-app Toast_Banner and update the relevant unread/tab state.
3. WHEN a NotificationEvent is created and the Recipient app is backgrounded, inactive, locked, or closed, THE Backend SHALL enqueue a push job in the Notification_Queue even if Presence_Service still temporarily reports an active Socket.IO connection.
4. THE Presence_Service SHALL NOT be the only source of truth for push suppression; push suppression SHALL require explicit foreground activity for the relevant context, not merely a recent socket heartbeat.
5. WHEN the App transitions from active to background, THE App SHALL publish or trigger a best-effort presence state update quickly enough that the Backend can treat the user as push-eligible before the 60 second heartbeat threshold expires.
6. WHEN the Notification_Worker processes a push job and the Recipient has one or more Device_Tokens, THE Notification_Worker SHALL send the notification via FCM multicast to all registered Device_Tokens.
7. WHEN the Notification_Worker sends an iOS push notification, THE APNs payload SHALL include a visible alert and `sound: "default"` unless the user has disabled notification sound at the OS level.
8. WHEN the Notification_Worker processes a push job and the Recipient has no registered Device_Tokens, THE Notification_Worker SHALL log the skip with reason `no_devices` and return without error.
9. WHEN the user taps a push notification, THE App SHALL call `router.push` with the value of the `route` field from the notification's data payload, after normalizing required route params.
10. WHEN the App is launched cold from a push notification, THE App SHALL inspect the last notification response and navigate to the target route once auth/router state is ready.
11. WHEN the App returns to the foreground within 30 seconds of a push being received without the user tapping it, THE App SHALL invalidate the `conversations.all` and `gasps.pending` React Query queries to refresh their data.
12. WHEN the `route` field is absent from a notification payload, or when a required identifier (`gaspId` for gasp events, `conversationId` for message events) is missing, THE Deep_Link_Resolver SHALL navigate to `/(tabs)/inbox`.

---

### Requirement 6: Correct Deep Link Routing

**User Story:** As a user, I want every notification — push or in-app toast — to open exactly the right screen, so that I am never dropped on a missing route.

#### Acceptance Criteria

1. WHEN the Deep_Link_Resolver receives a NotificationEvent with `kind === 'message.new'` and a valid `conversationId`, THE Deep_Link_Resolver SHALL return `/chat/:conversationId`.
2. WHEN the Deep_Link_Resolver receives a NotificationEvent with `kind === 'gasp.received'` and a valid `gaspId`, THE Deep_Link_Resolver SHALL return `/(modals)/view-gasp?gaspId=:gaspId`.
3. WHEN the Deep_Link_Resolver receives a NotificationEvent with `kind === 'gasp.reaction_received'` and a valid `gaspId`, THE Deep_Link_Resolver SHALL return `/(modals)/reaction-result?gaspId=:gaspId`.
4. WHEN the Deep_Link_Resolver receives a NotificationEvent with `kind === 'friend.request'`, THE Deep_Link_Resolver SHALL return `/(tabs)/discover`.
5. WHEN the Deep_Link_Resolver receives a NotificationEvent with `kind === 'friend.accepted'`, THE Deep_Link_Resolver SHALL return `/(tabs)/chat`.
6. THE Push_Service SHALL not contain any reference to the stale route `/(modals)/gasp-viewer`; all gasp-related navigation SHALL use `/(modals)/view-gasp`.
7. WHEN a `message.new` notification routes to `/chat/:conversationId`, THE payload or route params SHALL include enough participant metadata (`actorId`, `actorName`, and optional `actorAvatarUrl`) for the Chat screen to render a non-`Unknown` header before `useConversations()` has refreshed.
8. WHEN the App opens `/chat/:conversationId` from a push or toast and the conversation is not yet present in the local conversations cache, THE Chat screen SHALL fetch or derive the participant context before showing a fallback `Unknown` label.
9. WHEN a notification tap opens an existing conversation, THE App SHALL avoid creating a new conversation or new navigation stack entry for an unknown user.

---

### Requirement 7: Message Notification Rules

**User Story:** As a user, I want to receive unread indicators and alerts for new chat messages sent to me, so that I never miss a conversation without being spammed by my own sends.

#### Acceptance Criteria

1. WHEN a `message.new` socket event arrives, THE Socket_Listeners SHALL increment `unreadCount` for the matching conversation in the React Query cache only when `message.senderId !== currentUserId`.
2. WHEN a message is created and the Recipient is an Offline_User, THE Backend SHALL enqueue exactly one `message.new` push notification for the Recipient; THE Backend SHALL NOT enqueue a push for the Sender.
3. WHEN a `message.new` socket event arrives, THE Socket_Listeners SHALL update the `lastMessage`, `lastMessageAt`, and `updatedAt` fields of the matching conversation in the React Query cache regardless of whether the user is the sender or recipient.
4. WHEN a `message.new` push notification is sent, THE Backend SHALL populate the `conversationId` field in the NotificationEvent payload.
5. WHEN a `message.new` push notification is sent, THE Backend SHALL populate `actorId` and `actorName` for the sender so the receiving Chat screen can render the correct participant context immediately.

---

### Requirement 8: Gasp Notification Rules

**User Story:** As a gasp recipient, I want immediate visual signals when a gasp arrives, so that I can view it promptly.

#### Acceptance Criteria

1. WHEN a gasp is sent, THE Backend SHALL create a `gasp.received` NotificationEvent and deliver it via socket if the Recipient is online, or enqueue a push job if the Recipient is offline.
2. WHEN a `gasp.received` socket event arrives, THE Socket_Listeners SHALL prepend the gasp to the `gasps.pending` React Query cache entry using `[gasp, ...(old ?? [])]`.
3. WHEN a `gasp.received` socket event arrives, THE Notification_Store SHALL enqueue a toast with `title = "New Gasp from {actorName}"`, `body = "sent you a gasp"`, and `route = "/(modals)/view-gasp?gaspId=:gaspId"`.
4. WHEN a `gasp.received` socket event arrives, THE Notification_Store SHALL call `triggerTabPulse()` to activate the Gasps tab pulse indicator.

---

### Requirement 9: Reaction Notification Rules

**User Story:** As the sender of a gasp, I want to be notified when someone reacts to it, so that I can view the reaction result.

#### Acceptance Criteria

1. WHEN a reaction is created, THE Backend SHALL create a `gasp.reaction_received` NotificationEvent for the original gasp sender and SHALL deliver it via socket if that user is online, or enqueue a push job if offline.
2. WHEN a `gasp.reaction_received` socket event arrives, THE Socket_Listeners SHALL update the reaction entry in the React Query cache using the `reaction` object from the event payload.
3. WHEN a `gasp.reaction_received` socket event arrives and `AppState.currentState === 'active'`, THE Notification_Store SHALL enqueue a toast with `route = "/(modals)/reaction-result?gaspId=:gaspId"`.
4. WHEN a `gasp.reaction_received` push notification is sent, THE Backend SHALL populate `gaspId` in the NotificationEvent payload.

---

### Requirement 10: Friend Notification Rules

**User Story:** As a user, I want to receive notifications for incoming friend requests and accepted requests, so that I can manage my social connections promptly.

#### Acceptance Criteria

1. WHEN a friend request is created, THE Backend SHALL create a `friend.request` NotificationEvent for the Recipient and deliver it via socket if online, or enqueue a push job if offline.
2. WHEN a friend request is accepted, THE Backend SHALL create a `friend.accepted` NotificationEvent for the original requester and deliver it via socket if online, or enqueue a push job if offline.
3. WHEN a `friend.request` push notification is tapped, THE App SHALL navigate to `/(tabs)/discover`.
4. WHEN a `friend.accepted` push notification is tapped, THE App SHALL navigate to `/(tabs)/chat`.

---

### Requirement 11: Device Token Registration

**User Story:** As a user, I want my device to be registered for push notifications automatically after signing in, so that I receive pushes without any manual setup.

#### Acceptance Criteria

1. WHEN the user completes login, registration, or session restore, THE Push_Service SHALL call `registerIfNeeded()` asynchronously without blocking the auth flow.
2. WHEN push notification permission is granted, THE Push_Service SHALL obtain the Device_Token via `Notifications.getDevicePushTokenAsync()` and register it with the Backend via `POST /auth/devices`.
3. WHEN the Device_Token obtained matches the value stored in `SecureStore` under key `fcm_token`, THE Push_Service SHALL skip the registration API call.
4. IF push notification permission is denied, THEN THE Push_Service SHALL log the denial to Sentry at level `info`, persist `pushPermissionDenied = 'true'` in SecureStore, and SHALL NOT call `requestPermissionsAsync` again in the same session.
5. WHEN a push delivery attempt fails with FCM error code `messaging/registration-token-not-registered`, THE Notification_Worker SHALL delete that Device_Token from the `devices` table.
6. IF `getDevicePushTokenAsync` throws an error, THEN THE Push_Service SHALL capture the exception to Sentry and return silently without crashing the app.
7. IF the `POST /auth/devices` call fails, THEN THE Push_Service SHALL capture the exception to Sentry, delete the cached token from SecureStore to force retry on next launch, and return silently without crashing the app.

---

### Requirement 12: Android Notification Channel Configuration

**User Story:** As an Android user, I want notifications delivered to properly configured channels, so that notification priority and sound behave correctly on my device.

#### Acceptance Criteria

1. THE App SHALL declare at least two Android notification channels in `app.json`: one with `channelId: "messages"` for chat message notifications and one with `channelId: "gasps"` for gasp and reaction notifications, both with `importance: "high"`.
2. WHEN the App initialises on Android, THE Push_Service SHALL call `Notifications.setNotificationChannelAsync` for each channel to register them with the operating system.
3. WHEN the Notification_Worker sends a push to an Android device for a `message.new` event, THE Notification_Worker SHALL set `android.notification.channelId` to `"messages"`.
4. WHEN the Notification_Worker sends a push to an Android device for a `gasp.received` or `gasp.reaction_received` event, THE Notification_Worker SHALL set `android.notification.channelId` to `"gasps"`.

---

### Requirement 13: No Duplicate Notifications

**User Story:** As a user, I want every event to produce exactly one visible signal, so that I am not confused or spammed by repeated toasts or unread counts.

#### Acceptance Criteria

1. WHEN a NotificationEvent is about to be enqueued in the Toast_Queue, THE Toast_Queue SHALL compare the candidate `id` against `activeToast.id` and all `toastQueue[].id` entries; if a match exists the candidate SHALL be discarded.
2. WHEN the same `message.new` socket event fires more than once for the same `message.id`, THE Socket_Listeners SHALL increment `unreadCount` at most once across all firings.
3. WHEN the same `gasp.received` socket event fires more than once for the same `gasp.id`, THE Socket_Listeners SHALL ensure the gasp appears at most once in the `gasps.pending` React Query cache entry.
4. THE deduplication logic SHALL not suppress legitimate separate notifications that share no common identifier.

---

### Requirement 14: Notification Delivery Reliability

**User Story:** As a user, I want my messages and gasps to be saved even if the notification system has a failure, so that notification infrastructure problems never cause data loss.

#### Acceptance Criteria

1. WHEN the Notification_Queue `add` call throws, THE Backend SHALL catch the error, log it, and still return a success response for the originating message, gasp, or reaction action without rolling back the database write.
2. WHEN the Notification_Worker fails to deliver a push after exhausting all retry attempts, THE Backend SHALL log the failure including job id, recipient id, notification kind, and the error message.
3. THE Notification_Queue SHALL be configured with `attempts: 3` and exponential backoff starting at 5000 ms.
4. WHEN the Notification_Worker throws an unhandled error for a job, BullMQ SHALL move the job to the dead-letter (failed) queue rather than crashing the worker process; the worker SHALL continue processing subsequent jobs.

---

### Requirement 15: Notification Testing

**User Story:** As a developer, I want automated tests for notification contracts, routing, deduplication, and delivery decisions, so that regressions are caught before they reach users.

#### Acceptance Criteria

1. THE frontend SHALL include unit tests for `resolveDeepLink` covering all five NotificationKind values plus fallback for unknown kind and missing required IDs.
2. THE frontend SHALL include store tests for `notificationStore.enqueueToast` proving that a second enqueue with the same `id` does not modify `toastQueue` or `activeToast`.
3. THE frontend SHALL include tests for `useSocketListeners` proving that receiving the same `gasp.received` event twice does not add a duplicate entry to the `gasps.pending` cache.
4. THE frontend SHALL include tests for `useSocketListeners` proving that a `message.new` event from the current user does not increment `unreadCount`.
5. THE backend SHALL include unit tests for each notification builder function (`notifyGaspReceived`, `notifyNewMessage`, `notifyReactionReceived`, `notifyFriendRequest`, `notifyFriendAccepted`) verifying the output NotificationEvent has the correct `kind`, `route`, and required identifiers.
6. THE backend SHALL include a test proving that `notifyNewMessage` does not enqueue a push job for the sending user.
7. THE backend SHALL include a test proving that a Notification_Queue enqueue failure does not cause the parent message/gasp/reaction handler to throw or roll back.
