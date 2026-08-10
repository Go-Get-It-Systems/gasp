# Requirements — Profile Management MVP

## Goal

Let an authenticated user edit their name, username, bio, and profile photo reliably, with the new identity appearing throughout the app without a restart.

## Out of scope

- Privacy, account deletion, and notification controls.
- Profile posts, public/private profiles, or profile-photo moderation.
- Changing the verified phone number.

## Requirements

### R1 — Edit profile details

**User story:** As a user, I can update my public profile details so friends recognize me.

1. The Profile screen shall provide an Edit Profile action.
2. The edit screen shall prefill display name, username, bio, and avatar.
3. Display name shall be required and limited to 50 characters.
4. Username shall meet the existing API rule: 3–30 alphanumeric/underscore characters.
5. Bio shall be optional and limited to 200 characters.
6. The app shall show a field-level explanation for invalid values and a clear message for a taken username.

### R2 — Change or remove profile photo

**User story:** As a user, I can add, replace, or remove my profile photo.

1. The user shall choose a photo from the media library; camera capture may be added only if the existing picker supports it safely.
2. The app shall request photo permission only after the user starts this action.
3. The selected image shall be compressed before upload and uploaded only to the approved `avatars` storage path.
4. The user shall see a local preview and upload/progress state.
5. Removing the photo shall save `avatarUrl: null` and use the existing initials fallback.
6. A failed upload or save shall preserve the previously saved profile and offer retry.

### R3 — Consistent identity after save

1. On success, the app shall update the authenticated-user state and React Query data for `users/me`.
2. Profile, Settings, current-user avatars in conversation surfaces, and newly rendered social cards shall use the new identity without app restart.
3. The app shall prevent duplicate save submissions while a save is in progress.

### R4 — Authorization and resilience

1. The client shall update only the authenticated user's profile through `PATCH /users/me`.
2. The backend shall retain its uniqueness and approved-storage validation.
3. Network, upload, and API errors shall be observable in Sentry without storing raw image bytes or phone numbers.

## Acceptance checklist

- [ ] A user changes each text field and sees it after reopening the app.
- [ ] A user changes a photo and sees it in Profile and Settings immediately.
- [ ] A user removes a photo and sees initials fallback everywhere applicable.
- [ ] Taken and invalid usernames cannot be saved.
- [ ] Failed upload/save does not leave a broken or false-success avatar.
