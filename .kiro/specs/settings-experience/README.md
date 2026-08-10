# Settings Experience — Spec Family

## Purpose

This folder delivers user controls as small, independently releasable vertical slices. A slice is complete only when its app UI, API/data changes, automated tests, and physical-device verification are complete.

The product direction is a compact control centre for a private, camera-first social app — not a clone of a broad social network settings menu.

## Delivery order

| Order | Spec | Outcome | Depends on |
| --- | --- | --- | --- |
| 1 | `01-profile-management-mvp` | Edit identity and profile photo | Existing user API and upload flow |
| 2 | `02-settings-foundation` | Every Settings row opens a real, useful destination | 01 for Account destination |
| 3 | `03-trust-safety-block-report` | Block and report users safely | 02 for entry points |
| 4 | `04-notification-preferences` | Control social notification categories | Existing notification system |
| 5 | `05-privacy-presence-discovery` | Control activity status and discoverability | 02, 03 recommended |
| 6 | `06-reaction-saving-consent` | Control whether reactions can be saved | Product decision on default |
| 7 | `07-account-data-lifecycle` | Export, deactivate, and delete account data | Security/session design |

## Shared conventions

- **Safe default:** a new control must not expose more data or enable more sharing than the current private friends-only experience.
- **Source of truth:** account and social preferences live on the backend; device-only media settings remain local.
- **No false affordances:** a visible row must work, be deliberately disabled with a reason, or not be shown.
- **Destructive actions:** use an explanation, confirmation, and a reversible/grace period when the product permits it.
- **Release gate:** all acceptance criteria, relevant automated tests, and the `verification.md` device checklist must pass before the next slice begins.

## Existing implementation to preserve

- `PATCH /users/me` already accepts `displayName`, `username`, `avatarUrl`, and `bio`.
- Media upload, image compression, React Query caching, and Firebase authentication already exist.
- The backend already delivers canonical social notification events and stores push device registrations.
- Gasp media remains ephemeral; these specs must not weaken its existing expiry and access rules.

## Decision log

| ID | Decision | Status |
| --- | --- | --- |
| D1 | Profile photo can be removed and falls back to initials | Decided |
| D2 | Activity status is friends-only when enabled | Proposed; confirm in spec 05 |
| D3 | Reaction-saving default is off | Proposed; requires stakeholder approval before spec 06 |
| D4 | Account deletion has a grace period and revokes active sessions immediately | Proposed; requires legal/product approval before spec 07 |
