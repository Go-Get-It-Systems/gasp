# Design Document: Social Notification Experience

## Overview

The current notification architecture is already well separated:

- Native push for inactive, backgrounded, locked, or closed app states
- Foreground in-app toast while the app is active
- Socket/domain events for realtime cache updates
- Backend app-state tracking to avoid presence-only push suppression
- Push tap routing through `pushService.ts`

This design keeps that architecture and adds a clearer social product layer. The goal is not to rebuild notifications. The goal is to make every notification feel like a person-to-person moment and to eliminate ambiguity around reaction routing and friend-event foreground visibility.

## Product Direction

Modern social apps share a few patterns that fit GASP:

- Snapchat-like context: messages, snaps, and reactions continue inside a private social thread.
- BeReal-like authenticity: camera-first interactions feel more personal when reactions are captured media, not generic likes.
- Instagram Direct-like continuity: a notification should land in the exact conversation or content context.
- Facebook-like unread management: repeated events should not create noisy duplicate signals.

For GASP, the strongest product position is:

```txt
Notifications are not system alerts.
They are social moments that continue the camera/chat loop.
```

## Current System Inputs

### Frontend

- `services/pushService.ts`
- `services/notificationNavigation.ts`
- `hooks/useSocketListeners.ts`
- `stores/notificationStore.ts`
- `components/notifications/ToastBanner.tsx`
- `app/_layout.tsx`
- `app/chat/[id].tsx`

### Backend

- `src/modules/notifications/notifications.service.ts`
- `src/modules/notifications/notifications.payload.ts`
- `src/jobs/workers/notification.worker.ts`
- `src/socket/presence.gateway.ts`
- `src/socket/chat.gateway.ts`
- `src/socket/gasp.gateway.ts`
- `src/modules/messages/messages.routes.ts`
- `src/modules/reactions/reactions.routes.ts`
- `src/modules/friends/friends.routes.ts`

### Reference Documents

- `docs/current-notification-design.md`
- `.kiro/specs/gasp-notification-mvp/`
- `.kiro/specs/reaction-ui-polish/`

## Target Event Model

The canonical event model remains:

```typescript
export type NotificationKind =
  | 'message.new'
  | 'gasp.received'
  | 'gasp.reaction_received'
  | 'friend.request'
  | 'friend.accepted';

export interface NotificationEvent {
  kind: NotificationKind;
  recipientId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  title: string;
  body: string;
  route: string;
  conversationId?: string;
  gaspId?: string;
  reactionId?: string;
  reactionMessageId?: string;
  eventId?: string;
}
```

The social layer should treat `actorName`, `actorAvatarUrl`, `kind`, `route`, and `eventId` as first-class UI inputs.

## UX Behavior Matrix

| Event | App State | Visible Signal | Tap Target |
| --- | --- | --- | --- |
| Message | Active, same chat | Inline chat update | No toast |
| Message | Active, elsewhere | Foreground toast | `/chat/:conversationId` with actor metadata |
| Message | Background/closed | Native push | `/chat/:conversationId` with actor metadata |
| Gasp | Active | Foreground toast | `/(modals)/view-gasp?gaspId=...` |
| Gasp | Background/closed | Native push | `/(modals)/view-gasp?gaspId=...` |
| Reaction | Active | Foreground toast | Chosen reaction route contract |
| Reaction | Background/closed | Native push | Chosen reaction route contract |
| Friend request | Active | Foreground toast | Incoming requests surface |
| Friend request | Background/closed | Native push | Incoming requests surface |
| Friend accepted | Active | Foreground toast | Chat/social continuation surface |
| Friend accepted | Background/closed | Native push | Chat/social continuation surface |

## Reaction Route Contract

The current implementation sends reaction notifications to:

```txt
/(modals)/reaction-result?gaspId=:gaspId
```

But the product direction discussed around img19 favors a consistent 45/55 reaction layout and a chat-connected sender experience. This creates a decision point.

### Selected Contract

Use chat-first routing for received reactions:

```txt
/chat/:conversationId?highlightMessageId=:reactionMessageId&name=:actorName&avatarUrl=:actorAvatarUrl
```

Why:

- The reaction already exists as a chat message with `type: reaction`.
- The sender expects the received reaction to match the img19-style chat result.
- The user can continue the conversation immediately.
- The reaction does not feel detached from the original social loop.

### Required Payload Additions For Chat-First Reaction Routing

The backend should include:

- `conversationId`
- `reactionId`
- `reactionMessageId` or equivalent message id
- `actorId`
- `actorName`
- optional `actorAvatarUrl`
- `gaspId`

If `reactionMessageId` is not available yet, `conversationId` plus `reactionId` can be used as an intermediate contract, with the chat screen resolving the relevant message after messages load.

The implementation carries these identifiers in both the canonical `notification:event` payload and the `gasp:reaction_received` domain event. Missing chat context falls back to the inbox and is captured in Sentry.

### Rejected Fallback Contract

If implementation risk is too high for chat-first routing in this iteration, keep modal-first routing but make the modal visually match the same 45/55 reaction layout standard. Do not ship a modal that contradicts the chat reaction design.

## Foreground Toast Design

The toast should become a compact social card:

```txt
+------------------------------------------------+
| [avatar/thumb]  Alex                           |
|                 reacted to your gasp           |
+------------------------------------------------+
```

For gasps:

- Prefer media thumbnail or blurhash preview when available.
- Keep both the thumbnail and background media permanently blurred; only the gasp viewer may reveal the content.
- Body: `sent you a gasp`

For messages:

- Prefer actor avatar.
- Body: message preview, trimmed to one line.

For reactions:

- Prefer actor avatar.
- Body: `reacted to your gasp`

For friend events:

- Prefer actor avatar.
- Body: `sent you a friend request` or `accepted your request`

The toast should:

- Stay inside safe area.
- Use two text lines maximum.
- Use accessible button semantics.
- Deduplicate by event id.
- Avoid nested card layouts.
- Avoid large empty black surfaces.

## Generic Notification Event Listener

The backend emits `notification:event`, but the frontend currently relies mostly on domain socket events. The app should add a listener for generic notification events to cover friend events and future notification types.

### Listener Policy

```txt
If event kind is message/gasp/reaction:
  prefer domain event if it already created a toast for the same event id
  otherwise create a toast from notification:event

If event kind is friend.request or friend.accepted:
  create a toast from notification:event
  update relevant friend request/friendship cache if available
```

This keeps existing domain events working and fills the friend-event foreground gap.

## Deduplication Design

The visible toast id should be:

```txt
event.eventId ?? event.reactionId ?? event.gaspId ?? event.conversationId + ':' + event.kind
```

The notification store already dedupes by toast id. The new work should ensure domain events and `notification:event` use the same id for the same user-visible event.

## Unknown Chat Prevention

Routes that open chat from notification context should carry metadata:

```txt
/chat/:conversationId?name=:actorName&avatarUrl=:actorAvatarUrl
```

The chat screen should use this priority order:

1. Conversation cache participant metadata
2. Route params from notification
3. Direct conversation fetch
4. Last-resort fallback label only after fetch failure

The UI should not briefly render `Unknown` for a valid notification tap if actor metadata is available.

## Backend Changes

### Reactions

Update the reaction notification builder so `gasp.reaction_received` can support chat-first routing.

The reaction creation path already creates a chat reaction message. Capture or return that message id so it can be included in the notification payload.

### Friend Events

Ensure friend request and friend accepted flows call the canonical notification service and emit payloads with:

- `kind`
- `actorId`
- `actorName`
- optional `actorAvatarUrl`
- `route`
- `eventId`

### Payloads

Extend `notificationData()` only as needed to preserve additional reaction/chat ids. Keep all values strings for FCM compatibility.

## Frontend Changes

### Socket

Add typed `onNotificationEvent` support in `services/socket.ts`.

### Listener

Update `hooks/useSocketListeners.ts` to enqueue social toasts from `notification:event`, especially for friend events.

### Routing

Update `resolveDeepLink` or extract shared notification route resolution so push taps and toast taps use the same route contract.

### Toast

Update `ToastBanner` only within its current responsibility. Do not introduce a new global notification modal or history surface.

### Chat

Update `app/chat/[id].tsx` only as much as needed to prevent `Unknown` header state from notification routes and to support optional highlight params for reaction messages.

## Testing Strategy

### Frontend Unit Tests

- `pushService` or notification route resolver tests for the chosen reaction route contract
- `useSocketListeners` tests for `notification:event` friend request and friend accepted toasts
- `useSocketListeners` dedupe tests when domain event and generic event share event id
- Chat route metadata test to prevent unknown-user route construction
- Toast rendering tests for avatar/media fallback and accessibility

### Backend Unit Tests

- Reaction notification builder includes the route contract identifiers
- Friend request notification builder
- Friend accepted notification builder
- Notification payload serializes new fields
- Delivery still queues push when app is background/inactive

### Physical Device Validation

Use a physical iPhone and validate:

- App active in same chat
- App active in another screen
- App backgrounded
- App locked
- App killed

For each state, test:

- Message
- Gasp
- Reaction
- Friend request
- Friend accepted

Capture:

- Reactotron logs
- backend delivery result
- worker result
- Expo push token
- tap route
- no `Unknown` chat state

## Non-Goals

- Notification preferences screen
- Notification history inbox
- Advanced batching
- Rich push image attachments
- Scheduled prompts
- Ranking or personalization logic
- Rewriting the whole notification architecture

## Implementation Notes

- Follow `CLAUDE.md` rules: React Query for server state, Zustand for UI-only notification state, Sentry in catch paths, and typed navigation helpers where routes carry params.
- Keep changes incremental. The current infrastructure is good; this is a contract and UX refinement.
- Do not weaken background push delivery to solve duplicate foreground toasts. Deduplicate at the toast layer.
