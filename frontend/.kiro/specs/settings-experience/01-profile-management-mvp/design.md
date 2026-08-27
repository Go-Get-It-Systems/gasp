# Design — Profile Management MVP

## Existing surfaces

- `app/(tabs)/profile.tsx` opens Settings today.
- `app/(modals)/edit-profile.tsx` is a placeholder and becomes the edit form.
- `services/api/users.ts` already exposes `updateMe`.
- `services/uploadQueue.ts`, image compression, and avatar upload conventions should be reused rather than duplicated.

## UX flow

```text
Profile → Edit Profile
  → change details and/or choose/remove photo
  → Save
  → compress + upload avatar (if changed)
  → PATCH /users/me
  → update auth/query caches
  → return to Profile with success feedback
```

If upload succeeds but `PATCH` fails, retain the old profile locally, report the error, and leave the orphaned upload for normal storage cleanup. Do not write an invalid URL into state.

## App changes

- Add an Edit Profile affordance to `ProfileHeader` or profile screen.
- Replace the placeholder screen with a form using the shared Text, Avatar, Button, and error patterns.
- Add an avatar picker component/service that returns a local URI, then calls the existing image compression and upload flow.
- Extend the client `User` schema/type to include `bio` because the backend already returns it.
- On successful save, update `useAuthStore.user` and invalidate/update user/profile query keys.

## API contract

Use the existing endpoint:

```ts
PATCH /users/me
{
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
  bio?: string;
}
```

No database migration is required for this slice.

## Error states

| State | UI behavior |
| --- | --- |
| Photo permission denied | Explain why access is needed and provide a system-settings recovery action |
| Image compression/upload failure | Keep previous avatar; inline retry action |
| Username conflict | Inline message under username; preserve input |
| Offline/API failure | Preserve input; retry Save |
