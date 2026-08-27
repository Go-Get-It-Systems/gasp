# Implementation Plan: Gasp Notification MVP

## Overview

Implement a unified notification MVP for messages, gasps, reactions, and friend events. The work is split into waves so the contract and safety fixes land before broader delivery changes. Tests are included in each wave because the highest-risk failures are duplicates, broken routes, and sender self-notifications.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "title": "Frontend safety and route contract",
      "tasks": [1, 2, 3, 4],
      "dependsOn": []
    },
    {
      "wave": 2,
      "title": "Backend notification contract",
      "tasks": [5, 6, 7, 8],
      "dependsOn": [1]
    },
    {
      "wave": 3,
      "title": "Message, gasp, and reaction delivery",
      "tasks": [9, 10, 11, 12],
      "dependsOn": [2]
    },
    {
      "wave": 4,
      "title": "Foreground UI and dedupe",
      "tasks": [13, 14, 15, 16],
      "dependsOn": [3]
    },
    {
      "wave": 5,
      "title": "End-to-end validation",
      "tasks": [17, 18],
      "dependsOn": [4]
    }
  ]
}
```

## Tasks

### Wave 1 — Frontend safety and route contract

- [ ] 1. Remove duplicate root hook registration
  - [ ] 1.1 Update `app/_layout.tsx`
    - Ensure `useSocketListeners()` is called exactly once inside `RootContent`
    - Ensure `useOnlineStatus()` is called exactly once inside `RootContent`
    - Ensure `useAutoDownload()` is called exactly once inside `RootContent`
    - Preserve the existing AppState socket disconnect/reconnect behavior
    - _Requirements: 3.1, 7.1_

- [ ] 2. Create canonical frontend notification routing
  - [ ] 2.1 Add or refactor notification route resolver
    - Preferred file: `services/notificationRouting.ts`
    - Define `NotificationKind` and `NotificationEvent` frontend types matching the spec
    - Implement `resolveNotificationRoute(payload)` with routes:
      - `message.new` -> `/chat/:conversationId`
      - `gasp.received` -> `/(modals)/view-gasp?gaspId=:gaspId`
      - `gasp.reaction_received` -> `/(modals)/reaction-result?gaspId=:gaspId`
      - `friend.request` -> selected friend request route
      - `friend.accepted` -> `/(tabs)/chat`
    - Preserve `actorId`, `actorName`, and optional `actorAvatarUrl` when building chat routes from notification payloads
    - Return `/(tabs)/inbox` for unknown or incomplete payloads
    - Log fallback cases to Sentry with payload context
    - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 2.2 Write frontend route resolver tests
    - File: `services/__tests__/notificationRouting.test.ts` or extend `services/__tests__/pushService.test.ts`
    - Test valid route for every supported `NotificationKind`
    - Test fallback for unknown kind
    - Test fallback for missing `conversationId` on `message.new`
    - Test fallback for missing `gaspId` on `gasp.received`
    - Test fallback for missing `gaspId` on `gasp.reaction_received`
    - Test `message.new` preserves participant route params and never resolves to an unknown-user chat
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 12.1_

- [ ] 3. Update `pushService.ts` to use canonical routing
  - [ ] 3.1 Replace old `resolveDeepLink` mapping
    - Accept canonical `kind` values instead of old `type` values like `gasp`, `message`, and `reaction`
    - Keep backward-compatible parsing only if needed for currently deployed push payloads
    - Route push taps through `resolveNotificationRoute`
    - Handle cold-start notification taps via the last notification response once auth/router state is ready
    - Fix stale `/(modals)/gasp-viewer` references to `/(modals)/view-gasp`
    - Preserve existing permission and token registration behavior
    - _Requirements: 1.6, 5.1, 5.2, 5.3, 5.6, 6.1, 11.1, 11.2, 11.4, 11.5, 11.6_

  - [ ]* 3.2 Update `pushService` tests
    - Update existing deep-link tests to canonical `kind` values
    - Add compatibility tests only if backward compatibility is retained
    - Ensure existing token registration tests still pass
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 11.1, 11.2, 12.1, 12.9_

- [ ] 4. Checkpoint Wave 1
  - Run frontend notification routing and push service tests
  - Manually inspect `app/_layout.tsx` to confirm no duplicate realtime hook calls remain
  - Confirm all changed route strings correspond to existing Expo Router files
  - _Requirements: 5.6, 7.1, 12.1_

---

### Wave 2 — Backend notification contract

- [ ] 5. Define backend notification contract
  - [ ] 5.1 Update backend shared notification types
    - File: `gasp-backend/src/shared/types.ts` or a new notification-specific type file
    - Replace or extend old `NotificationType` values with canonical `NotificationKind` values:
      - `message.new`
      - `gasp.received`
      - `gasp.reaction_received`
      - `friend.request`
      - `friend.accepted`
    - Define a `NotificationEvent` interface matching the requirements
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 6. Add backend payload builders
  - [ ] 6.1 Refactor `modules/notifications/notifications.service.ts`
    - Add `buildMessageNotification`
    - Add `buildGaspReceivedNotification`
    - Add `buildReactionReceivedNotification`
    - Add `buildFriendRequestNotification`
    - Add `buildFriendAcceptedNotification`
    - Ensure all builders include `kind`, `recipientId`, `actorId`, `actorName`, `title`, `body`, `route`, and required IDs
    - Ensure `message.new` includes enough actor metadata for the receiver's Chat header to render before cache refresh
    - Keep convenience notify functions if useful, but make them use the builders
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.3, 9.2, 10.2_

  - [ ]* 6.2 Write backend payload builder tests
    - File: `gasp-backend/src/modules/notifications/notifications.service.test.ts`
    - Test `message.new` payload includes `conversationId` and `/chat/:conversationId`
    - Test `message.new` payload includes sender `actorId` and `actorName`
    - Test `gasp.received` payload includes `gaspId` and `/(modals)/view-gasp`
    - Test `gasp.reaction_received` payload includes `gaspId` and `/(modals)/reaction-result`
    - Test friend request and friend accepted payload routes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 12.4, 12.6_

- [ ] 7. Add delivery abstraction
  - [ ] 7.1 Implement `deliverNotification(event)`
    - Check recipient app state/context in addition to existing presence helper
    - If recipient is foreground-active in the same relevant context, emit/cache realtime updates without native push
    - If recipient is foreground-active elsewhere, emit/cache realtime updates and let the app show Toast_Banner
    - If recipient is backgrounded, inactive, locked, closed, or app-state is unknown, enqueue a notification job even if presence is still temporarily online
    - Catch and log delivery failures without throwing to callers
    - Include `kind`, `recipientId`, and domain IDs in logs
    - _Requirements: 3.1, 4.1, 4.2, 4.6_

  - [ ]* 7.2 Write delivery behavior tests
    - Mock presence as online and verify socket path is used
    - Mock background/inactive app state with recent online presence and verify push is still enqueued
    - Mock presence as offline and verify queue path is used
    - Mock socket/queue failure and verify `deliverNotification` resolves without throwing
    - _Requirements: 4.1, 4.2, 4.6, 12.7, 12.8_

- [ ] 8. Update notification worker payload handling
  - [ ] 8.1 Refactor `jobs/workers/notification.worker.ts`
    - Accept canonical `NotificationEvent` data
    - Send `notification: { title, body }`
    - Send canonical routing fields in FCM `data`
    - Include iOS APNs `sound: "default"` and visible alert payload for background/locked delivery
    - Use channel `messages` for `message.new`, otherwise `gasps` or a sensible default
    - Preserve invalid-token removal
    - _Requirements: 1.2, 4.3, 4.4, 4.5_

  - [ ]* 8.2 Write worker/service tests for push payload
    - Verify worker passes canonical fields into FCM `data`
    - Verify iOS push payload includes default sound
    - Verify invalid token removal is preserved
    - Verify no devices results in a skipped result, not a throw
    - _Requirements: 4.3, 4.4, 4.5, 12.7_

---

### Wave 3 — Message, gasp, and reaction delivery

- [ ] 9. Wire message notifications
  - [ ] 9.1 Notify recipients when messages are sent
    - Identify all conversation participants except sender
    - Build one `message.new` Notification_Event per recipient
    - Call `deliverNotification` after the message is persisted and unread count is updated
    - Preserve existing `chat:new_message` and `chat:conversation_updated` socket behavior
    - Ensure sender is never notified about their own message
    - Include sender display metadata in every recipient notification payload
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 9.2 Write backend message notification tests
    - Test recipient selection excludes sender
    - Test multiple recipients each receive one notification event
    - Test push/open route provides the sender name before the conversation cache is warm
    - Test notification failure does not fail `sendMessage`
    - _Requirements: 8.1, 8.2, 8.4, 12.5, 12.8_

- [ ] 10. Normalize gasp notifications
  - [ ] 10.1 Update `gasps.routes.ts`
    - After `sendGasp`, build and deliver `gasp.received`
    - After `batchSendGasp`, build and deliver one `gasp.received` per recipient
    - Include `actorId`, `actorName`, `gaspId`, and `route`
    - Preserve existing gasp socket/cache behavior
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

  - [ ]* 10.2 Write backend gasp notification tests
    - Test single gasp notification route and payload
    - Test batch gasp creates one notification per recipient
    - Test notification failure does not fail the gasp creation response
    - _Requirements: 9.1, 9.2, 12.6, 12.8_

- [ ] 11. Wire reaction notifications
  - [ ] 11.1 Update `reactions.routes.ts`
    - After `createReaction`, load the original gasp sender
    - Preserve existing chat reaction message creation
    - Build and deliver `gasp.reaction_received` to the original gasp sender
    - Include `actorId`, `actorName`, `gaspId`, and `route`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 11.2 Write backend reaction notification tests
    - Test reaction notification goes to original gasp sender
    - Test payload includes `gaspId` and reaction result route
    - Test notification failure does not fail reaction creation
    - _Requirements: 10.1, 10.2, 10.6, 12.6, 12.8_

- [ ] 12. Checkpoint Wave 3
  - Run backend notification, message, gasp, and reaction tests
  - Confirm existing backend tests still pass for messages, gasps, reactions, and workers
  - _Requirements: 8.1, 9.1, 10.1, 12.4, 12.5, 12.6, 12.8_

---

### Wave 4 — Foreground UI and dedupe

- [ ] 13. Make notification store generic and deduped
  - [ ] 13.1 Update `stores/notificationStore.ts`
    - Replace gasp-only `ToastItem` fields with generic notification fields
    - Add dedupe by `id` across active toast and queued toasts
    - Preserve FIFO behavior for different IDs
    - Preserve `tabPulseTrigger`, `inboxUnreadType`, and chat unread state or replace with equivalent canonical state
    - _Requirements: 3.2, 3.5, 7.2, 7.5, 7.6_

  - [ ]* 13.2 Write notification store dedupe tests
    - Same toast ID enqueued twice appears once
    - Same ID is deduped when currently active
    - Different IDs preserve FIFO queue order
    - Dequeue still promotes the next toast
    - _Requirements: 7.2, 7.5, 7.6, 12.2_

- [ ] 14. Make `ToastBanner` generic
  - [ ] 14.1 Update `components/notifications/ToastBanner.tsx`
    - Display title/body from generic ToastItem
    - Support optional gasp thumbnail/blurhash when present
    - Navigate using `toast.route` instead of hardcoded gasp route
    - Render useful labels for message, gasp, reaction, and friend notifications
    - Keep animation and auto-dismiss behavior
    - _Requirements: 3.2, 3.5, 5.1, 5.2, 5.3, 9.6, 10.6_

  - [ ]* 14.2 Update ToastBanner tests
    - Tap on gasp toast navigates to `/(modals)/view-gasp`
    - Tap on message toast navigates to `/chat/:conversationId`
    - Tap on reaction toast navigates to `/(modals)/reaction-result`
    - Queue promotion still works after dismiss
    - _Requirements: 5.1, 5.2, 5.3, 9.6, 10.6, 12.1_

- [ ] 15. Update socket listener foreground handling
  - [ ] 15.1 Refactor `hooks/useSocketListeners.ts`
    - Ensure `app/chat/[id].tsx` sets `chatStore.activeConversationId` on mount and clears it on unmount/focus loss
    - Dedupe pending gasps by `gasp.id` before prepending
    - Dedupe messages by `message.id` before unread increment
    - Enqueue generic toasts for `gasp.received`, `message.new` outside active conversation, and `gasp.reaction_received`
    - Do not show noisy message toast or unread increment for the active conversation
    - Set tab indicators consistently for chat, gasp, and reaction events
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 7.3, 7.4, 8.5, 8.6, 9.3, 9.5, 10.4_

  - [ ]* 15.2 Write socket listener dedupe tests
    - Duplicate `gasp.received` does not duplicate pending gasps
    - Duplicate `chat:new_message` does not increment unread twice
    - Active conversation message appends without unread increment
    - New gasp enqueues one toast and triggers tab pulse
    - Reaction event enqueues/updates foreground state as specified
    - _Requirements: 3.2, 3.3, 3.4, 7.3, 7.4, 8.6, 9.3, 10.4, 12.3_

- [ ] 16. Checkpoint Wave 4
  - Run frontend notification store, toast, socket listener, and push tests
  - Confirm existing chat/gasp tests still pass
  - Manually inspect foreground behavior in simulator/device
  - Confirm active chat receives inline updates without Toast_Banner and without native notification
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 7.4, 12.1, 12.2, 12.3_

---

### Wave 5 — End-to-end validation

- [ ] 17. Manual QA on device
  - App open: receive message outside active conversation, verify chat unread signal
  - App open: receive message inside active conversation, verify no noisy toast and no unread increment
  - App open: receive gasp, verify toast, pending gasps update, Gasps tab indicator, and tap route
  - App open: receive reaction, verify reaction/chat state and tap route
  - App backgrounded: receive message push and tap to chat
  - App backgrounded: receive gasp push and tap to view-gasp
  - App backgrounded: receive reaction push and tap to reaction-result
  - iPhone physical device: background the app while connected by cable, send a message, verify iOS banner/list item/sound or vibration according to OS settings
  - iPhone physical device: tap a message notification from a cold start and verify the existing chat opens with the correct participant name, never `Unknown`
  - iPhone physical device: send within 60 seconds after backgrounding and verify the presence heartbeat window does not suppress push
  - Send two gasps quickly and verify separate valid toasts are preserved
  - Replay same event payload and verify duplicate UI state is prevented
  - _Requirements: 3.1, 4.1, 5.1, 5.2, 5.3, 7.2, 7.3, 7.4, 9.6, 10.6_

- [ ] 18. Final automated verification
  - Run frontend tests relevant to notification, socket, chat, gasps, and push
  - Run backend tests relevant to notifications, messages, gasps, reactions, and worker behavior
  - Confirm no TypeScript errors in touched frontend and backend files
  - Confirm logs contain enough context for notification delivery failures
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9_

## Notes

- Tasks marked with `*` are test tasks. They are part of the MVP quality bar and should only be skipped with an explicit product/engineering decision.
- Friend request route remains an open product choice: `/(tabs)/discover` vs `/(tabs)/inbox`.
- If backend and frontend types cannot be physically shared in this repo, keep matching type definitions and tests on both sides.
- Keep notification delivery best-effort. Domain actions must not fail because a push or socket side effect failed.
