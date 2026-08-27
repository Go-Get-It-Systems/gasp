# Verification — Profile Management MVP

## Automated

- Form validation accepts valid display name, username, and bio boundaries.
- API conflict maps to a username field error.
- Upload failure leaves the saved user/avatar unchanged.
- Successful update refreshes auth state and profile query data.

## Manual device checklist

1. Open Profile and enter Edit Profile; confirm all current values are prefilled.
2. Change name, username, and bio; save; force a profile refresh and confirm persistence.
3. Choose a photo; confirm preview, save progress, and final avatar in Profile and Settings.
4. Send/open a chat after changing the avatar; confirm the current user has the new avatar where rendered.
5. Remove the avatar; confirm the initials fallback.
6. Deny photo permission; confirm the recovery path does not trap the user.
7. Disable network before Save; confirm input remains and retry succeeds after reconnect.
