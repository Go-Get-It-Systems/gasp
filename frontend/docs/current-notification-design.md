# Current Notification Flow Design

This document captures the current notification architecture for the GASP mobile app and backend. It is intended to make the existing flow explicit before further UI or delivery changes.

## Scope

The current notification flow covers:

- New chat messages
- Received gasps
- Received gasp reactions
- Friend request and friend accepted notifications
- Foreground in-app toast behavior
- Background and inactive native push behavior
- Notification tap routing

## Design Goals

- Foreground users should receive lightweight in-app feedback without duplicate native banners.
- Background, inactive, or closed app users should receive native push notifications with sound.
- Users inside the active chat should not receive duplicate message toasts for the conversation they are already viewing.
- Notification taps should route to the relevant app surface with enough context to avoid empty, unknown, or broken screens.
- Socket presence must not incorrectly suppress push delivery when a physical device is already in the background.

## Frontend Flow

### Device Registration

Device registration is triggered after login, registration, session restore, and silent refresh from `stores/authStore.ts`.

The app requests notification permission in `services/pushService.ts`. If permission is granted:

- iOS uses `Notifications.getExpoPushTokenAsync()`.
- Android uses `Notifications.getDevicePushTokenAsync()`.
- The token is sent to the backend through `services/api/devices.ts`.
- The token is cached in SecureStore under `fcm_token` to avoid redundant registration.

This distinction matters because the backend notification worker can send Expo push tokens through Expo's push API, while raw APNs tokens are not sent through Firebase Admin as FCM multicast tokens.

### Foreground Native Handler

`services/pushService.ts` configures Expo Notifications so native banners and sounds are shown only when the app is backgrounded or inactive.

When the app is active:

- Native banner is suppressed.
- Native sound is suppressed.
- Badge/list state can still be updated.
- UI feedback is handled by the custom `ToastBanner`.

### App State Reporting

`app/_layout.tsx` reports notification visibility state to the backend through the socket event `notification:app_state`.

The payload includes:

- `state`: `active`, `inactive`, or `background`
- `activeConversationId`: current chat conversation id when available

When the app goes from active to background, the socket is disconnected after sending the background state. When the app returns active, the socket reconnects and emits active state again.

### Socket UI Events

`hooks/useSocketListeners.ts` is the main frontend event dispatcher.

Current handled socket events include:

- `gasp:received`
- `gasp:reaction_received`
- `chat:new_message`
- `chat:conversation_updated`
- `chat:message_read`
- `presence:*`

Socket events that deliver data update React Query cache directly. UI state such as unread indicators and toast queue is stored in Zustand.

### Toast Behavior

`stores/notificationStore.ts` owns the toast queue and active toast.

`components/notifications/ToastBanner.tsx` renders the active toast and routes the user when tapped.

Current toast behavior:

- New gasp: enqueues a toast and routes to `/(modals)/view-gasp?gaspId=...`
- New reaction: enqueues a toast and routes to the chat containing the reaction card
- New chat message: enqueues a toast only if the message is not from the current user and the conversation is not active

For chat toasts, the route includes cached participant metadata when available:

- `name`
- `avatarUrl`

This prevents the chat screen from opening as an unknown user when the conversation cache has the participant details.

### Push Tap Routing

Push notification taps are handled by `openNotificationResponse()` in `services/pushService.ts`.

The app resolves push payloads by notification kind:

| Kind | Route |
| --- | --- |
| `gasp.received` | `/(modals)/view-gasp?gaspId=...` |
| `message.new` | `/chat/:conversationId?name=...&avatarUrl=...` |
| `gasp.reaction_received` | `/chat/:conversationId?highlightMessageId=...&name=...&avatarUrl=...` |
| `friend.request` | `/(tabs)/inbox` |
| `friend.accepted` | `/(tabs)/chat` |

Cold-start notification taps are handled by `openLastNotificationResponseIfAny()` after auth and router initialization are ready.

## Backend Flow

### Notification Event Builders

`src/modules/notifications/notifications.service.ts` builds canonical notification events for:

- Messages
- Gasps
- Reactions
- Friend requests
- Accepted friend requests

Each event includes:

- `kind`
- `recipientId`
- `actorId`
- `actorName`
- optional `actorAvatarUrl`
- `title`
- `body`
- `route`
- optional domain ids such as `conversationId`, `gaspId`, `reactionId`, `eventId`

### Delivery Decision

`deliverNotification()` checks whether the recipient is online.

If online, the backend emits `notification:event` to the user's socket room.

Then it checks `shouldSuppressPushForUser()`:

- If the user is foreground-active and online, push is suppressed.
- Otherwise, the push notification is queued.

This means an online user whose app is backgrounded receives `socket+push`, not socket-only.

### Presence And App State

`src/socket/presence.gateway.ts` tracks regular socket presence and notification app state separately.

Notification app state is stored in Redis with a short TTL. Disconnects set the app state to `background`.

Push suppression requires both:

- app state is `active`
- user is online

This protects physical iOS devices from losing native push notifications just because socket presence briefly remains online during background transition.

### Push Worker

`src/jobs/workers/notification.worker.ts` processes queued push jobs.

Before sending, it checks `shouldSuppressPushForUser()` again. This prevents a queued background push from firing if the user has already reopened the app.

The worker sends:

- Expo push tokens through Expo push API
- Non-Expo tokens through Firebase Admin multicast

Push payload includes canonical notification data from `notificationData()`, including route and actor metadata.

## Current Behavior Matrix

| Scenario | Expected Behavior |
| --- | --- |
| App active, user in same chat | Inline message only, no toast, no native push |
| App active, user in another screen | In-app toast, unread state updates, no native push |
| App inactive/background | Native push with sound, socket may also receive event |
| App killed/closed | Native push; tap cold-starts into resolved route |
| Gasp received while active | In-app toast and pending gasp cache update |
| Gasp received while backgrounded | Native push; tap opens `view-gasp` |
| Reaction received while active | Reaction toast and inbox reaction indicator |
| Reaction received while backgrounded | Native push; tap opens the reaction chat context |
| Friend request while active | Foreground toast; tap opens incoming friend requests |
| Friend request while backgrounded | Native push; tap opens incoming requests in Inbox |
| Friend accepted while active/backgrounded | Foreground toast or native push; tap opens chat |

## Known Friction Points

### 1. Physical Device Delivery Still Needs Runtime Evidence

The app now listens to the canonical `notification:event` socket payload for friend events and uses event-id dedupe with domain events. Reaction notifications now open the chat context containing the reaction card.

Native iOS delivery still needs real-device evidence for the current build, token, queue, and APNs/Expo delivery chain.

### 2. Chat Identity Uses Safe Fallbacks

Chat identity now resolves in this order: conversation cache, notification route metadata, direct conversation fetch, then the neutral `Chat` label. A valid notification tap will not render `Unknown` while the cache is cold.

### 3. Native Delivery Prerequisites

The code and focused tests validate the delivery contract, but native push delivery still depends on:

- iOS notification permission state
- physical device token registration
- backend device row
- notification job queue execution
- Expo push receipt status
- build/profile push entitlement configuration

## Validation Checklist

### Device Setup

- Install a fresh development or TestFlight build on a physical iPhone.
- Log in with a real test user.
- Confirm notification permission is granted in iOS Settings.
- Confirm the app logs an Expo push token that starts with `ExpoPushToken[`.
- Confirm backend `devices` has the current user's token.

### Message Tests

- Same chat open: send message from another user; confirm no native push and no in-app toast.
- Different app screen open: send message; confirm in-app toast appears and tap opens the correct chat with name/avatar.
- App backgrounded: send message; confirm native banner, sound/vibration, and tap opens the correct chat.
- App killed: send message; confirm native banner and cold-start routing.

### Gasp Tests

- App active: send gasp; confirm in-app toast and pending gasp update.
- App backgrounded: send gasp; confirm native banner and tap opens `view-gasp`.
- Open the gasp from push and send a reaction; confirm no missing conversation id errors.

### Reaction Tests

- Sender active: receiver sends reaction; confirm in-app reaction feedback and chat reaction message.
- Sender backgrounded: receiver sends reaction; confirm native push.
- Tap reaction push and confirm it opens the correct chat and highlights the reaction card.

### Friend Notification Tests

- Send friend request while recipient is active; confirm the in-app toast appears and opens Inbox.
- Send friend request while recipient is backgrounded; confirm native push and Inbox route.
- Accept friend request while recipient is active/backgrounded; confirm UI and push behavior.

## Focused Test Coverage

Current focused coverage validates:

- iOS Expo token registration
- Android device token registration
- push deep-link route resolution
- chat toast route metadata
- active conversation toast suppression
- backend socket-only delivery when app is active
- backend socket+push delivery when online but not active
- backend push-only delivery when offline
- notification worker Expo push path
- notification worker FCM path
- notification worker active-user suppression

Useful commands:

```bash
npm test -- --runInBand services/__tests__/pushService.test.ts hooks/__tests__/useSocketListeners.test.ts
```

```bash
npm run test:run -- src/modules/notifications/notifications.service.test.ts src/jobs/workers/notification.worker.test.ts
```

Run the first command from `gasp/` and the second from `gasp-backend/`.

## Recommended Next Step

Before changing UI or delivery code again, run the physical-device validation checklist and capture:

- Reactotron app logs
- backend notification delivery result
- notification worker result
- Expo receipt result for iOS tokens

That evidence will separate product UX decisions from infrastructure delivery failures.
