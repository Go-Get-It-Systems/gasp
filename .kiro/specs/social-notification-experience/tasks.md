# Implementation Plan: Social Notification Experience

## Overview

This plan upgrades the existing notification system from a technically correct delivery layer into a cleaner social notification experience. It is split into waves so the reaction route contract and friend-event foreground gap are handled before UI polish.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "title": "Contract decisions and routing",
      "tasks": [1, 2, 3],
      "dependsOn": []
    },
    {
      "wave": 2,
      "title": "Generic notification event handling",
      "tasks": [4, 5, 6],
      "dependsOn": [1]
    },
    {
      "wave": 3,
      "title": "Social toast UI refinement",
      "tasks": [7, 8],
      "dependsOn": [2]
    },
    {
      "wave": 4,
      "title": "Backend payload support",
      "tasks": [9, 10, 11],
      "dependsOn": [1]
    },
    {
      "wave": 5,
      "title": "Validation",
      "tasks": [12, 13],
      "dependsOn": [2, 3, 4]
    }
  ]
}
```

## Tasks

### Wave 1 — Contract decisions and routing

- [x] 1. Finalize the reaction notification route contract
  - [x] 1.1 Choose chat-first or modal-first behavior for `gasp.reaction_received`
    - Recommended: chat-first route to the conversation containing the Reaction_Card
    - Fallback: modal-first only if the modal matches the same 45/55 reaction layout standard
    - Document the selected route in this spec before implementation
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Update frontend notification route resolution
  - [x] 2.1 Update `services/pushService.ts` or extract `services/notificationRouting.ts`
    - Make push taps and toast taps use the same route contract
    - Preserve actor name/avatar metadata in chat routes
    - Add reaction route behavior from Task 1
    - Keep safe fallback to `/(tabs)/inbox`
    - Capture fallback cases to Sentry
    - _Requirements: 3.5, 3.6, 4.1, 4.2, 4.3_

  - [x]* 2.2 Add route resolver tests
    - Test `message.new` preserves actor name/avatar
    - Test `gasp.received`
    - Test chosen `gasp.reaction_received` contract
    - Test friend request and friend accepted routes
    - Test missing ids fallback to inbox
    - _Requirements: 3.6, 4.1, 4.2, 9.3, 9.4_

- [x] 3. Prevent unknown chat state on notification opens
  - [x] 3.1 Update `app/chat/[id].tsx`
    - Use notification route params as immediate participant metadata when cache is cold
    - Fetch or derive participant context before rendering `Unknown`
    - Reveal and briefly focus the routed reaction card when `highlightMessageId` is available
    - Preserve existing back behavior
    - Avoid creating a new conversation from notification route open
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x]* 3.2 Add chat notification metadata tests
    - Validate route metadata prevents unknown header fallback
    - Validate missing metadata fetch/fallback behavior
    - _Requirements: 4.1, 4.2, 4.3, 8.5_

### Wave 2 — Generic notification event handling

- [x] 4. Add typed generic notification socket listener
  - [x] 4.1 Update `services/socket.ts`
    - Add `NotificationEvent` socket payload type if not already shared
    - Add `onNotificationEvent` listener registration
    - Return cleanup function following existing socket listener pattern
    - _Requirements: 2.4, 2.5, 5.1, 5.2_

- [x] 5. Handle friend events in `useSocketListeners`
  - [x] 5.1 Update `hooks/useSocketListeners.ts`
    - Listen for `notification:event`
    - Enqueue `friend.request` Foreground_Toast while active
    - Enqueue `friend.accepted` Foreground_Toast while active
    - Update or invalidate friend request/friendship queries when safe
    - Use the same route resolver as push taps
    - _Requirements: 2.4, 2.5, 5.1, 5.2, 5.3, 5.4_

  - [x]* 5.2 Add generic notification listener tests
    - Test friend request toast
    - Test friend accepted toast
    - Test route values
    - Test no internal event names appear in UI payload
    - _Requirements: 1.4, 1.5, 5.1, 5.2, 9.1_

- [x] 6. Dedupe domain events and generic notification events
  - [x] 6.1 Normalize visible toast ids
    - Use `eventId` when available
    - Fall back to stable domain ids only when event id is missing
    - Ensure domain events and `notification:event` use the same id for the same visible event
    - _Requirements: 7.4, 5.5_

  - [x]* 6.2 Add dedupe tests
    - Same message event from domain socket and generic socket produces one toast
    - Same reaction event from domain socket and generic socket produces one toast
    - Different event ids preserve FIFO queue behavior
    - _Requirements: 7.4, 9.2_

### Wave 3 — Social toast UI refinement

- [x] 7. Refine `ToastBanner` as a social card
  - [x] 7.1 Update `components/notifications/ToastBanner.tsx`
    - Actor-first layout
    - Avatar or permanently blurred media thumbnail slot
    - Stable fallback identity visual
    - Two-line text maximum
    - Safe-area compliant compact dimensions
    - Accessible pressable label and button role
    - No nested card structure
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x]* 7.2 Add or update toast component tests
    - Renders actor name
    - Renders action copy
    - Renders fallback when avatar/media is missing
    - Press action opens the route
    - Accessibility label exists
    - _Requirements: 1.1, 1.3, 6.5, 6.6_

- [x] 8. Normalize notification copy
  - [x] 8.1 Update toast creation sites
    - Message: actor name plus message preview
    - Gasp: actor name plus `sent you a gasp`
    - Reaction: actor name plus `reacted to your gasp`
    - Friend request: actor name plus `sent you a friend request`
    - Friend accepted: actor name plus `accepted your request`
    - Ensure no raw event kind is user-visible
    - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

### Wave 4 — Backend payload support

- [x] 9. Extend reaction notification payload for selected contract
  - [x] 9.1 Update `gasp-backend/src/modules/reactions/reactions.routes.ts`
    - Capture the created reaction chat message id when available
    - Pass conversation id, reaction id, gasp id, actor metadata, and message id into notification builder
    - Preserve existing chat reaction message creation
    - _Requirements: 3.5, 9.5_

  - [x] 9.2 Update `gasp-backend/src/modules/notifications/notifications.service.ts`
    - Build `gasp.reaction_received` payload according to the selected route contract
    - Include required ids in `NotificationEvent`
    - Preserve existing delivery behavior
    - _Requirements: 3.5, 7.2, 7.5_

  - [x]* 9.3 Add backend reaction payload tests
    - Test all ids required by the selected route contract
    - Test route value
    - Test delivery failure does not fail reaction creation
    - _Requirements: 3.5, 7.5, 9.5_

- [x] 10. Wire friend notifications to canonical social payloads
  - [x] 10.1 Update friend request and accepted flows
    - Ensure `friend.request` is delivered with actor metadata and event id
    - Ensure `friend.accepted` is delivered with actor metadata and event id
    - Include routes matching frontend resolver
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x]* 10.2 Add backend friend notification tests
    - Test friend request payload
    - Test friend accepted payload
    - Test notification failure does not fail the relationship action
    - _Requirements: 5.1, 5.2, 9.6_

- [x] 11. Extend push payload serialization if needed
  - [x] 11.1 Update `gasp-backend/src/modules/notifications/notifications.payload.ts`
    - Add new ids required by the chosen reaction route contract
    - Keep FCM data values string-only
    - Preserve existing fields
    - _Requirements: 3.5, 9.5_

  - [x]* 11.2 Add payload serialization tests
    - Verify new fields are included when present
    - Verify empty optional fields are omitted
    - _Requirements: 3.5, 9.5_

### Wave 5 — Validation

- [x] 12. Run automated validation
  - [x] 12.1 Frontend
    - Run focused notification route tests
    - Run `useSocketListeners` tests
    - Run ToastBanner tests
    - Run TypeScript check
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 12.2 Backend
    - Run notification service tests
    - Run worker tests
    - Run reaction route/service tests
    - Run friend route/service tests
    - Run typecheck
    - _Requirements: 9.5, 9.6_

- [ ] 13. Validate on physical iPhone
  - Current validation attempt (2026-07-15): the current branch built successfully and installed on the paired iPhone 15 Pro. iOS denied launch because the development signing profile has not yet been trusted on the device, so native push evidence is still pending.
  - [ ] 13.1 Prepare device validation
    - Confirm notification permission granted
    - Confirm Expo push token is registered
    - Confirm backend device row exists
    - Confirm Reactotron captures app logs
    - _Requirements: 8.1, 8.4_

  - [ ] 13.2 Execute scenario matrix
    - Message: active same chat, active elsewhere, background, locked, killed
    - Gasp: active, background, locked, killed
    - Reaction: active, background, locked, killed
    - Friend request: active, background
    - Friend accepted: active, background
    - Confirm tap routes and no `Unknown` chat state
    - _Requirements: 8.2, 8.3, 8.5_

  - [ ] 13.3 Record validation evidence
    - Reactotron logs
    - backend delivery result
    - worker result
    - tap route result
    - final pass/fail notes
    - _Requirements: 8.4, 8.5_
