# Design — Notification Preferences

## Preference model

Persist one preference row per user (or a typed JSON column if database conventions prefer it) with booleans for:

```ts
messages, gasps, reactions, friendRequests, friendAccepted
```

All values default to `true` for migration compatibility. The server, not the mobile app, checks the relevant value in `deliverNotification()` before enqueueing a native push. Foreground socket/domain events continue to update app data; whether a foreground toast follows the same toggle must be explicitly documented in implementation and applied consistently.

## API

- `GET /users/me/notification-preferences`
- `PATCH /users/me/notification-preferences`

Use one typed response shared by backend and frontend where possible. Do not treat a push `devices` row as a notification preference.

## UI

Show the current device permission status above category toggles. Explain that iOS/Android system settings can still suppress all pushes.
