# Requirements — Notification Preferences

## Goal

Let users choose which social moments create notifications without breaking reliable delivery or in-app state updates.

## Requirements

1. Users shall independently control push notifications for messages, gasps, reactions, friend requests, and friendship accepted events.
2. Existing default behavior shall be retained for existing users until they change a preference.
3. A disabled push category shall not prevent domain writes, unread state, or in-app content from updating.
4. A disabled OS permission shall be clearly distinguished from a disabled GASP category.
5. Preferences shall apply across the user's devices after server persistence and shall take effect for the next generated event.
6. The app shall offer a system-settings link when push permission is denied.

## Out of scope

- Marketing notifications, digest scheduling, quiet hours, notification history, and per-person mute.

## Acceptance checklist

- [ ] Turning off each category suppresses only its background/native push.
- [ ] The same event still appears in the relevant app surface.
- [ ] Re-enabling a category applies on a second device after refresh.
