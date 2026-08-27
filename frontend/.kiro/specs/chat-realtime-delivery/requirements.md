# Requirements: Chat Realtime Delivery

## Objective

Make new chat activity reach every connected participant, regardless of the
screen currently open, and reflect it immediately in the conversation list and
Chat tab indicator.

## Requirements

### 1. Participant-scoped message delivery

**User story:** As a recipient outside a thread, I want a new message to reach
my app in realtime so I know there is something to read without opening Chat.

#### Acceptance criteria

1. The backend delivers `chat:new_message` and `chat:conversation_updated` to
   the personal socket room of every conversation participant, including the
   sender.
2. Delivery does not depend on a client joining `conversation:<id>`.
3. A participant receives one logical update per message, even when a legacy
   conversation-room subscription also exists.

### 2. Reconnection safety

**User story:** As someone who backgrounds or reconnects the app, I want an
open conversation to regain its ephemeral realtime features.

#### Acceptance criteria

1. An open chat rejoins its conversation room after every socket reconnect.
2. Existing join/leave authorization remains unchanged.
3. The implementation does not create duplicate socket handlers on rerender.

### 3. Inbox and indicator consistency

**User story:** As a recipient, I want the Chat tab indicator and inbox row to
appear as soon as an unread message arrives.

#### Acceptance criteria

1. A received, inactive-conversation message updates a known conversation row
   and unread count immediately.
2. A message for an unknown local conversation invalidates the authoritative
   conversations query rather than fabricating participant data.
3. The Chat tab indicator appears immediately while a refetch is pending.
4. The indicator clears once authoritative conversations contain no unread
   messages.
5. `notification:event` for `message.new` provides a defensive fallback when
   a message transport event is delayed or unavailable.

### 4. Dedupe and current behavior

#### Acceptance criteria

1. Duplicate message events do not increment unread counts or show duplicate
   toasts.
2. A sender's own message never increments its unread count.
3. The active conversation remains toast-free and unread-free.
4. Typing, read receipts, Gasp, reaction, push-notification, and REST behavior
   remain unchanged.

### 5. Quality and validation

#### Acceptance criteria

1. Backend tests prove personal-room fan-out for sender and recipient.
2. Frontend tests cover notification fallback, uncached conversations, tab
   indicator hint/reconciliation, and reconnect subscription cleanup.
3. Typecheck and lint pass in each affected repository where their baseline
   permits.
4. Manual QA uses two authenticated users: recipient outside a thread, inside
   a thread, and after a reconnect.

## Out of scope

- New REST endpoints, socket payload fields, or database models.
- Push delivery policy changes.
- Notification history or a notification-center UI.
