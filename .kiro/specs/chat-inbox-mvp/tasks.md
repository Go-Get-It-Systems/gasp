# Implementation Plan: Chat Inbox MVP

## Overview

Replace the friend-directory-first Chat tab with a conversation-first inbox,
while retaining a simple Friends view for starting new conversations and the
existing Send Gasp to All action. Reuse current conversation, friend, socket,
and typed navigation contracts; do not introduce backend work or a notification
history in this MVP.

## Tasks

- [x] 1. Establish required inbox helpers and localized copy
  - [x] 1.1 Add `components/chat/conversationPreview.ts`
    - Resolve the other participant from `Conversation` and the current user.
    - Map `text`, `gasp`, `reaction`, `image`, and absent last messages to a
      safe one-line preview.
    - Format a short relative activity time from `lastMessageAt ?? updatedAt`.
    - Keep server types derived from the existing Zod schemas; do not create
      manual domain types.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.3, 6.5_

  - [x] 1.2 Add localized user-facing copy
    - Add tabs, search placeholders, message-type previews, and empty-state
      strings to `locales/en.json` and applicable existing locale files.
    - Ensure Gasp/reaction text is privacy-safe and contains no media preview.
    - _Requirements: 2.4, 3.5, 4.2, 4.4, 4.6_

  - [x] 1.3 Add pure-helper tests
    - Cover participant selection, each message preview variant, missing
      values, relative time fallback, and no layout-breaking output.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.3, 6.6_

- [x] 2. Build the reusable Conversation_Row
  - [x] 2.1 Create `components/chat/ConversationListItem.tsx`
    - Render avatar or stable initials fallback, name, preview, timestamp, and
      non-zero unread badge.
    - Apply a readable unread visual state without relying on color alone.
    - Reuse the existing presence data only as a secondary optional dot.
    - Add accessible button role and complete row label.
    - Keep the component focused and below the project size guideline.
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.8, 6.1, 6.2, 6.3_

  - [x] 2.2 Add Conversation_Row component tests
    - Verify text, Gasp, reaction, image, and no-last-message previews.
    - Verify unread badge/weight only appear for non-zero unread counts.
    - Verify avatar fallback and press navigation callback.
    - Verify accessibility label includes person, summary, and unread state.
    - _Requirements: 2.1 through 2.8, 6.1 through 6.3, 6.6_

- [x] 3. Recompose the Chat tab around Chats and Friends
  - [x] 3.1 Update `app/(tabs)/chat.tsx`
    - Fetch both `useConversations()` and `useFriends()`.
    - Add local selected-view state with **Chats** as the default.
    - Add accessible segmented controls for Chats and Friends.
    - Render Conversation_Row data, sorted by `lastMessageAt ?? updatedAt`, in
      Chats; render existing FriendListItem data only in Friends.
    - Own exactly one local `searchQuery` and one local selected-view state;
      filter the selected data source with `useMemo` and use a view-specific
      placeholder.
    - Do not read or write `inboxStore.searchQuery` in this screen.
    - Preserve typed `openChat()` navigation and the get-or-create flow from
      the Friends view.
    - Remove `StatsRow` from the Chat tab and preserve SendGaspToAllButton.
    - _Requirements: 1.1 through 1.6, 3.1 through 3.4, 4.1 through 4.3, 6.4_

  - [x] 3.2 Add view-specific loading, empty, and error states
    - Use existing skeleton/QueryState patterns for each server data source.
    - Chats empty state must offer a control that selects Friends.
    - Friends empty/no-results state must remain clear and non-blocking.
    - Do not show a blank list while a query is loading or failed.
    - _Requirements: 3.5, 4.4, 4.5_

  - [x] 3.3 Add Chat-tab screen tests
    - Verify Chats is selected by default.
    - Verify switching to Friends changes list source and search placeholder.
    - Verify the Chats empty-state action selects Friends.
    - Verify Send Gasp remains visible and routes to the camera.
    - _Requirements: 1.1, 1.5, 3.1 through 3.5, 4.1, 4.2, 4.4, 6.4, 6.6_

- [x] 4. Close the uncached-message realtime gap
  - [x] 4.1 Update `hooks/useSocketListeners.ts`
    - Preserve direct cache updates for known conversation ids.
    - Detect an incoming `chat:new_message` for an absent conversation entry.
    - Invalidate `queryKeys.conversations.all` so `useConversations()` fetches
      the authoritative row with participant metadata.
    - Preserve current behavior for messages from the signed-in user, active
      conversation messages, unread counts, toasts, and tab indicators.
    - Do not add server data to Zustand or create a partial local conversation.
    - _Requirements: 5.1 through 5.6, 6.5_

  - [x] 4.2 Extend socket-listener tests
    - Verify known conversations still update in place.
    - Verify an unknown conversation invalidates/refetches the conversation
      query exactly once per received event.
    - Verify active-conversation and own-message unread rules remain intact.
    - _Requirements: 5.1 through 5.5, 6.4, 6.6_

- [ ] 5. Validate the MVP
  - [x] 5.1 Run focused automated checks
    - Run affected Conversation_Row, Chat-tab, and socket-listener tests.
    - Run lint/type checks where the current repository baseline permits.
    - Record pre-existing failures separately from feature failures.
    - _Requirements: 6.6_

  - [ ] 5.2 Perform manual mobile QA
    - Verify all scenarios from the design validation matrix on at least one
      iOS or Android device/simulator.
    - Confirm a first incoming message becomes visible after refetch.
    - Confirm a Gasp preview never reveals ephemeral media in the inbox.
    - Confirm long names, offline friends, empty states, search, and screen
      reader labels remain usable.
    - _Requirements: 1.1 through 1.6, 2.1 through 2.8, 3.1 through 3.5,
      4.1 through 4.5, 5.1 through 5.6, 6.1 through 6.4_

### Automated validation results — 2026-08-06

| Check | Result |
|---|---|
| Focused Chat Inbox tests | Pass — 27 tests across screen, row, helper, toggle, and socket coverage. |
| Full test suite | Pass — 30 suites, 304 tests. |
| `npx tsc --noEmit` | Pass. |
| ESLint on feature source and tests | Pass. |
| Manual device QA | Pending — needs two authenticated test users to exercise first-message and Gasp flows. |

## Notes

- Automated test tasks are required. This resolves Requirement 6.6 and keeps
  message-awareness behavior safe as the realtime layer evolves.
- Follow `gasp/CLAUDE.md`: React Query owns server state; Zustand only owns UI
  state; user-facing copy is localized; every interactive element is
  accessible; and components should remain small and single-purpose.
- This spec intentionally does not modify backend APIs, push payloads, or the
  existing notification-route contract.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1", "5.2"] }
  ]
}
```
