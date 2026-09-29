# Requirements — Account Data Lifecycle

## Goal

Give users understandable control over their data: inspect/export it, temporarily deactivate, or request permanent account deletion.

## Product/legal decisions required

Confirm retention periods, export contents, identity re-verification, deletion grace period, and support obligations with the product owner and privacy counsel before implementation. This spec defines product behavior, not legal advice.

## Requirements

### R1 — Data export

1. A user shall request an export of their account information in a secure, time-limited download.
2. The request shall require recent authentication or a suitable phone/Firebase re-verification step.
3. The export shall include only the requesting user's permitted data and document exclusions/ephemeral content rules.
4. The app shall show request status and expiry without exposing the archive to another session.

### R2 — Deactivation

1. A user shall be able to deactivate their account without immediate irreversible deletion.
2. Deactivation shall stop discoverability, activity status, new interactions, and push delivery.
3. Re-authentication shall restore the account if still within the defined retention window.

### R3 — Permanent deletion

1. A user shall request deletion after explicit confirmation and re-verification.
2. The service shall immediately revoke active sessions and devices, then perform deletion/anonymization after the approved grace period.
3. The UI shall clearly state what will disappear, what may be retained for safety/legal reasons, and the cancellation deadline.

## Acceptance checklist

- [ ] A user cannot export another user’s data or use an expired download.
- [ ] Deactivated users are absent from normal social surfaces and cannot receive interactions.
- [ ] Deletion revokes sessions immediately and completes according to documented retention rules.
