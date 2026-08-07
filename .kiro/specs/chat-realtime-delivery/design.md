# Design: Chat Realtime Delivery

## Delivery model

`user:<userId>` is the durable delivery room for a connected participant.
`conversation:<conversationId>` remains available for ephemeral conversation
features (typing and read receipts), but it is not the delivery guarantee for
new messages.

```text
sender emits chat:send_message
        |
backend persists message and unread counts
        |
fan-out chat:new_message + chat:conversation_updated
        |
user:<sender>       user:<recipient>
        |                    |
frontend cache update / authoritative invalidate
        |
conversation row + Chat indicator
```

## Backend

- Load all participant ids through the existing message service after a message
  is persisted, whether it originated from Socket.IO or the existing REST
  endpoint.
- Emit both chat events once to each unique personal user room.
- Keep notification dispatch as a separate transport fallback; do not alter its
  eligibility rules.

## Frontend

- Keep `chat:new_message` as the primary cache-update path.
- On `notification:event` of `message.new` for an inactive conversation, set a
  UI-only unread hint and invalidate `queryKeys.conversations.all`.
- `CustomTabBar` shows its chat marker when either the authoritative
  conversations cache has unread items or the temporary unread hint is true.
- Reconcile the hint to false after the conversations cache confirms no unread
  items.
- `app/chat/[id]` registers one reconnect handler that repeats
  `chatJoinConversation(id)` and disposes it on unmount.

## Dedupe

The existing message-id checks in React Query and toast queue remain the single
dedupe mechanism. Backend fan-out targets personal rooms only, avoiding a
second message transport for a normally connected user.

## Validation matrix

| Scenario | Expected result |
|---|---|
| Recipient on Camera | Chat marker and row update without tab navigation |
| Recipient in Chat list | Unread badge, preview, ordering, and marker update |
| Recipient in thread | Message is rendered; no unread increment or toast |
| First conversation | Conversations query refetches and then shows metadata |
| Reconnect in thread | Join is repeated and typing/read realtime remains available |
| Duplicate transport/notification | One unread increment and one toast at most |
