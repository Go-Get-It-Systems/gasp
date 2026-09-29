# Requirements Document

## Introduction

The Social Notification Experience turns the existing GASP notification infrastructure into a clearer social product flow. The app already has push registration, foreground toasts, socket events, notification app-state reporting, and backend delivery decisions. This spec focuses on how those events should feel and route for users.

The target experience follows the shared patterns used by modern social apps:

- Background users receive native push with sound, vibration, and direct context.
- Foreground users receive a lightweight in-app notification instead of an OS banner.
- Message and media notifications open the exact place where the social interaction continues.
- Reactions remain attached to the original conversation instead of feeling like detached system events.
- Friend/social graph events are visible in foreground and push states.
- Notification copy and UI are actor-first: "Alex reacted", "Alex sent you a gasp", not backend-event-first.

This spec builds on:

- `docs/current-notification-design.md`
- `.kiro/specs/gasp-notification-mvp/`
- `.kiro/specs/reaction-ui-polish/`

Out of scope for this iteration: notification preferences screen, notification history inbox, complex notification grouping, rich media push attachments, scheduled reminders, and algorithmic notification ranking.

---

## Glossary

- **Social_Notification**: A notification presented as a user-to-user moment rather than as a generic system event.
- **Actor**: The user who caused the notification.
- **Recipient**: The user who receives the notification.
- **Foreground_Toast**: The custom in-app notification shown while the app is active.
- **Native_Push**: The OS notification shown while the app is inactive, backgrounded, locked, or closed.
- **Reaction_Card**: The chat message UI that represents a received reaction video in the conversation.
- **Reaction_Result_Modal**: The modal route `/(modals)/reaction-result`.
- **Notification_Route_Contract**: The agreed mapping between notification kind and the screen opened when the user taps it.
- **Generic_Notification_Event**: The backend socket event named `notification:event`.
- **Domain_Socket_Event**: A socket event tied to a specific product domain, such as `chat:new_message`, `gasp:received`, or `gasp:reaction_received`.
- **Unknown_Chat_State**: Any chat header or thread opened from notification context without correct participant name/avatar.

---

## Requirements

### Requirement 1: Actor-First Notification Presentation

**User Story:** As a user, I want notifications to feel like social moments from a person, so that I immediately understand who interacted with me and what happened.

#### Acceptance Criteria

1. WHEN the app displays any Social_Notification, THE UI SHALL show the Actor name as the highest-priority identity signal.
2. WHEN `actorAvatarUrl` is available, THE Foreground_Toast SHALL show the Actor avatar or a clear visual equivalent.
3. WHEN `actorAvatarUrl` is unavailable, THE Foreground_Toast SHALL show a stable fallback identity treatment and SHALL NOT render an empty thumbnail.
4. THE Social_Notification copy SHALL use user-facing action language such as "sent you a gasp", "reacted to your gasp", "sent you a message", or "accepted your request".
5. THE Social_Notification UI SHALL NOT expose internal event names such as `message.new`, `gasp.received`, or `gasp.reaction_received`.

---

### Requirement 2: Foreground Toast Covers All Social Events

**User Story:** As a user with the app open, I want every relevant social event to appear in the app without relying on OS banners.

#### Acceptance Criteria

1. WHEN a `message.new` event is received while the app is active and the conversation is not active, THE app SHALL show a Foreground_Toast.
2. WHEN a `gasp.received` event is received while the app is active, THE app SHALL show a Foreground_Toast.
3. WHEN a `gasp.reaction_received` event is received while the app is active, THE app SHALL show a Foreground_Toast.
4. WHEN a `friend.request` event is received while the app is active, THE app SHALL show a Foreground_Toast.
5. WHEN a `friend.accepted` event is received while the app is active, THE app SHALL show a Foreground_Toast.
6. WHILE the app is active, THE native notification handler SHALL continue suppressing OS banners and sound for foreground notifications.
7. THE Foreground_Toast SHALL auto-dismiss without blocking the user's current task.

---

### Requirement 3: Reaction Notification Route Contract

**User Story:** As the sender of a gasp, I want a reaction notification to take me to the reaction in the same social context where the conversation continues, so that the experience feels consistent with the chat layout.

#### Acceptance Criteria

1. THE product SHALL define a single route contract for `gasp.reaction_received` before implementation.
2. IF the chosen route is chat-first, THEN tapping a reaction push or Foreground_Toast SHALL open `/chat/:conversationId` with enough context to highlight or reveal the Reaction_Card.
3. IF the chosen route remains modal-first, THEN `/(modals)/reaction-result` SHALL visually match the 45/55 reaction layout standard from the current reaction UI direction.
4. THE app SHALL NOT show the sender a detached reaction format that contradicts the agreed img19-style reaction experience.
5. THE backend payload for `gasp.reaction_received` SHALL include all identifiers required by the chosen route contract.
6. THE app SHALL provide a safe fallback to `/(tabs)/inbox` when required reaction routing identifiers are missing, and SHALL log the fallback to Sentry.

---

### Requirement 4: No Unknown Chat From Notification Taps

**User Story:** As a user tapping a notification, I want the opened chat to show the correct person immediately, so that it does not feel like I was sent to a broken or new unknown conversation.

#### Acceptance Criteria

1. WHEN a `message.new` push notification opens `/chat/:conversationId`, THE route or screen SHALL have enough Actor metadata to render the correct participant name before conversation cache refresh completes.
2. WHEN a `gasp.reaction_received` notification opens chat, THE route or screen SHALL have enough Actor metadata to render the correct participant name before conversation cache refresh completes.
3. IF route params do not include name/avatar metadata, THEN the Chat screen SHALL fetch or derive participant context before rendering an `Unknown` header.
4. THE app SHALL NOT create a new conversation as a side effect of opening an existing notification route.
5. THE app SHALL preserve back navigation to the previous surface when a notification is tapped from inside the app.

---

### Requirement 5: Friend Events Use The Same Notification Layer

**User Story:** As a user, I want friend requests and accepted requests to behave like normal social notifications, so that relationship activity is not invisible while I am using the app.

#### Acceptance Criteria

1. WHEN the backend emits `notification:event` with `kind === 'friend.request'`, THE app SHALL enqueue a Foreground_Toast while active.
2. WHEN the backend emits `notification:event` with `kind === 'friend.accepted'`, THE app SHALL enqueue a Foreground_Toast while active.
3. WHEN a `friend.request` notification is tapped, THE app SHALL navigate to the surface where the user can review incoming friend requests.
4. WHEN a `friend.accepted` notification is tapped, THE app SHALL navigate to the chat or social surface where the new relationship can continue.
5. Friend event toasts SHALL dedupe by event id to avoid repeated banners for the same relationship event.

---

### Requirement 6: Toast UI Feels Native To A Social Camera App

**User Story:** As a user, I want in-app notifications to feel polished, light, and media-aware, so that they match the rest of the GASP experience.

#### Acceptance Criteria

1. THE Foreground_Toast SHALL use a compact card that fits within the safe area on all supported iPhone sizes.
2. THE Foreground_Toast SHALL avoid large empty dark surfaces and SHALL use avatar/media/fallback visual treatment to create context.
3. THE Foreground_Toast SHALL support an optional media thumbnail for gasp events and SHALL keep that media permanently blurred until the user opens the gasp.
4. THE Foreground_Toast SHALL support Actor avatar for message, reaction, and friend events.
5. THE Foreground_Toast SHALL keep text to two short lines maximum.
6. THE Foreground_Toast SHALL have accessible labels and button role for tap interaction.
7. THE Foreground_Toast SHALL be implemented without nested card layouts.

---

### Requirement 7: Delivery Semantics Remain Reliable

**User Story:** As a user, I want to receive notifications reliably in the background without duplicate signals in the foreground.

#### Acceptance Criteria

1. WHEN the recipient app is active, THE app SHALL prefer Foreground_Toast and SHALL suppress native OS banner display.
2. WHEN the recipient app is inactive, backgrounded, locked, or closed, THE backend SHALL enqueue Native_Push even if socket presence is temporarily online.
3. WHEN the recipient app is active in the same chat, THE app SHALL update the chat inline without showing a Foreground_Toast or Native_Push.
4. WHEN the same notification event arrives through both a domain socket event and `notification:event`, THE app SHALL dedupe visible Foreground_Toast by event id.
5. Notification delivery failure SHALL NOT roll back message, gasp, reaction, or friend domain writes.

---

### Requirement 8: Validation On Physical iPhone

**User Story:** As the product team, we want proof that the notification experience works on a physical iPhone, so that we do not rely only on simulator or unit-test confidence.

#### Acceptance Criteria

1. THE implementation SHALL include a physical iPhone validation checklist before the feature is considered complete.
2. THE checklist SHALL include app active, app in another screen, app backgrounded, app locked, and app killed states.
3. THE checklist SHALL include message, gasp, reaction, friend request, and friend accepted events.
4. THE validation SHALL capture evidence for push permission, Expo push token registration, backend device row, notification worker result, and tap route.
5. THE validation SHALL explicitly confirm no `Unknown` chat state appears after tapping message or reaction notifications.

---

### Requirement 9: Automated Tests

**User Story:** As a developer, I want tests around the social notification contract, so that future notification changes do not break routing or visible behavior.

#### Acceptance Criteria

1. THE frontend SHALL test Foreground_Toast creation for `friend.request` and `friend.accepted` from `notification:event`.
2. THE frontend SHALL test dedupe when a domain event and Generic_Notification_Event represent the same event id.
3. THE frontend SHALL test message notification routes preserve actor name/avatar metadata.
4. THE frontend SHALL test the chosen reaction route contract.
5. THE backend SHALL test `gasp.reaction_received` payload includes all ids required by the chosen reaction route contract.
6. THE backend SHALL test friend request and friend accepted notification payloads.
