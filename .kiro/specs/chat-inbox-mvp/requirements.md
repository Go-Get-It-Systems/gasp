# Requirements Document: Chat Inbox MVP

## Introduction

The current Chat tab is a directory of all friends. Although the app already
fetches conversations containing `lastMessage`, `lastMessageAt`, and
`unreadCount`, that data is not presented as the primary screen. As a result,
when a user receives a message, the tab badge and transient notification may
appear, but the sender and the pending conversation are not clearly visible in
the Chat tab.

This MVP turns the Chat tab into a simple, conversation-first inbox. It keeps
the existing **Send Gasp to All** action and retains a friend directory for
starting a new chat. The scope is intentionally limited: it does not add a
notification history, message pinning, per-conversation notification settings,
or new backend endpoints.

## Glossary

- **Chat_Inbox**: The default Chat-tab view that shows recent conversations.
- **Conversation_Row**: One pressable row that represents a conversation.
- **Friend_Directory**: The secondary Chat-tab view listing all friends, used
  to start a chat that has no prior messages.
- **Unread_Conversation**: A conversation whose `unreadCount` is greater than
  zero for the signed-in user.
- **Conversation_Preview**: A short, safe description of the most recent
  message or Gasp activity in a Conversation_Row.
- **Conversation_Source**: The existing paginated `GET /conversations` data
  consumed through `useConversations()`.
- **Friend_Source**: The existing friends data consumed through `useFriends()`
  and presence state managed by `useOnlineStatus()`.

## Requirements

### Requirement 1: Conversation-First Default View

**User Story:** As a user opening Chat, I want to see people I have recently
spoken with first, so that I can immediately identify and return to messages
that need my attention.

#### Acceptance Criteria

1. WHEN the user opens the Chat tab, THE app SHALL display Chat_Inbox as the
   default view.
2. THE Chat_Inbox SHALL use Conversation_Source and SHALL sort rows by most
   recent conversation activity.
3. THE Chat_Inbox SHALL include conversations with both read and unread
   messages, including a conversation whose most recent activity is a Gasp or
   reaction.
4. THE Chat_Inbox SHALL NOT render the complete Friend_Directory before the
   conversation list.
5. THE screen header SHALL provide a clear control to switch between
   **Chats** and **Friends**.
6. THE selected view control SHALL use accessible tab semantics and shall
   identify the selected state to assistive technology.

### Requirement 2: Clear Conversation Row Identity and State

**User Story:** As a user receiving a message, I want the inbox to show who
sent it and what happened, so that I know exactly which conversation to open.

#### Acceptance Criteria

1. EACH Conversation_Row SHALL show the other participant's avatar or a
   stable initial fallback, display name, and relative activity time.
2. EACH Conversation_Row SHALL show a Conversation_Preview derived from the
   most recent message type.
3. Text-message previews SHALL use a one-line, truncated copy of the message
   content.
4. Gasp and reaction previews SHALL use localized, privacy-safe copy and
   SHALL NOT expose Gasp media in the inbox.
5. WHEN `unreadCount > 0`, THE Conversation_Row SHALL visually distinguish
   the participant name and preview, and SHALL show the unread count.
6. WHEN `unreadCount === 0`, THE Conversation_Row SHALL NOT show an empty,
   zero, or stale unread badge.
7. WHEN a friend is online, THE Conversation_Row MAY show the existing online
   presence indicator without making presence more prominent than unread
   activity.
8. Tapping a Conversation_Row SHALL open its existing conversation with the
   correct participant name and avatar.

### Requirement 3: Friends Remain Available for New Conversations

**User Story:** As a user who wants to contact a friend for the first time, I
want a simple way to find that friend, so that conversation-first ordering does
not hide anyone.

#### Acceptance Criteria

1. WHEN the user selects **Friends**, THE app SHALL show Friend_Directory
   using the existing friend data and online presence treatment.
2. THE Friends view SHALL preserve the existing ability to search by friend
   display name or username.
3. Tapping a friend SHALL use the existing get-or-create conversation flow and
   open the resulting chat.
4. THE Friends view SHALL NOT show a fake unread count, message preview, or
   timestamp when no conversation exists.
5. THE Friends view SHALL retain an understandable empty state when the user
   has no friends or the search returns no match.

### Requirement 4: Simple MVP Controls and Empty States

**User Story:** As a user, I want the Chat tab to remain quick and uncluttered,
so that I can either respond, find a friend, or send a Gasp without learning a
new complex interface.

#### Acceptance Criteria

1. THE Chat tab SHALL retain the **Send Gasp to All** primary action and its
   current camera destination.
2. THE search field SHALL search the selected view: participant names in Chats
   and friend display names/usernames in Friends.
3. THE existing aggregate Friends/New Gasps/Online statistics row SHALL NOT
   appear above Chat_Inbox in this MVP.
4. WHEN the user has no conversations, THE Chat_Inbox SHALL show an empty
   state that explains there are no chats yet and offers a route to Friends.
5. Loading and error states for Chats and Friends SHALL use the existing
   QueryState/skeleton conventions and SHALL not render a misleading blank
   list.
6. All new user-visible strings SHALL be added to the locale files.

### Requirement 5: Realtime Inbox Consistency

**User Story:** As a user receiving a message while on another screen, I want
the sender to appear in Chat when I return, so that a notification always has a
visible destination in the product.

#### Acceptance Criteria

1. WHEN `chat:new_message` is received for a conversation already present in
   the Conversation_Source cache, THE app SHALL update its last message,
   activity time, and unread count according to the current unread rules.
2. WHEN `chat:new_message` is received for a conversation absent from the
   Conversation_Source cache, THE app SHALL invalidate or refetch the
   conversation list so the server-authoritative row becomes available.
3. THE app SHALL NOT create a fabricated Conversation model in Zustand or a
   component solely to make a new message visible.
4. WHEN the user opens a Conversation_Row, THE existing mark-as-read behavior
   SHALL clear that conversation's unread count without clearing other rows.
5. A message received for the active conversation SHALL continue to update the
   thread inline without creating an unread count or an inbox toast.
6. THE existing push and foreground-toast route contract SHALL remain
   unchanged in this MVP.

### Requirement 6: Quality, Accessibility, and Regression Safety

**User Story:** As a user, I want the redesigned inbox to be clear and
reliable across supported devices, so that it improves chat awareness without
regressing the existing social flow.

#### Acceptance Criteria

1. EVERY new interactive control SHALL provide an accessibility label and
   appropriate role.
2. Conversation_Row accessibility text SHALL include the participant name,
   latest activity summary, and unread count when applicable.
3. Avatar fallbacks, long names, long message previews, and missing timestamps
   SHALL render without layout overflow or a crash.
4. THE implementation SHALL preserve the existing bottom-tab unread indicator
   and **Send Gasp to All** interaction.
5. Server state SHALL remain in React Query; Zustand SHALL only store UI state
   and SHALL NOT own the selected Chat/Friends view or either list's search
   query in this feature.
6. The implementation SHALL include focused automated tests for the new row
   variants, filtering, and cache-refresh behavior.

## Out of Scope

- A persistent notification/activity center or notification-history endpoint.
- Message requests, conversation pinning, mute controls, or read-receipt
  preferences.
- Group conversations, direct replies from native notifications, or chat
  bubbles.
- Backend API or database changes.
- Visual previews of ephemeral Gasp media inside the Chat_Inbox.
